use yona_rust_vcs::VcsError;

pub(crate) fn apply_svndiff0(source: &[u8], body: &[u8]) -> Result<Vec<u8>, VcsError> {
    if !body.starts_with(b"SVN\0") {
        return Err(VcsError::InvalidPath);
    }
    let mut cursor = 4;
    let mut target = Vec::new();
    while cursor < body.len() {
        let source_offset = svndiff_int(body, &mut cursor)?;
        let source_length = svndiff_int(body, &mut cursor)?;
        let target_length = svndiff_int(body, &mut cursor)?;
        let instructions_length = svndiff_int(body, &mut cursor)?;
        let new_data_length = svndiff_int(body, &mut cursor)?;
        if cursor + instructions_length + new_data_length > body.len() {
            return Err(VcsError::InvalidPath);
        }
        let instructions = &body[cursor..cursor + instructions_length];
        cursor += instructions_length;
        let new_data = &body[cursor..cursor + new_data_length];
        cursor += new_data_length;
        let source_end = source_offset
            .checked_add(source_length)
            .ok_or(VcsError::InvalidPath)?;
        if source_end > source.len() {
            return Err(VcsError::InvalidPath);
        }
        let source_view = &source[source_offset..source_end];
        let window_start = target.len();
        let mut instruction_cursor = 0usize;
        let mut new_data_cursor = 0usize;
        while instruction_cursor < instructions.len() {
            let instruction = instructions[instruction_cursor];
            instruction_cursor += 1;
            let op = instruction >> 6;
            let inline_length = (instruction & 0x3f) as usize;
            let length = if inline_length == 0 {
                svndiff_int(instructions, &mut instruction_cursor)?
            } else {
                inline_length
            };
            match op {
                0 => {
                    let offset = svndiff_int(instructions, &mut instruction_cursor)?;
                    let end = offset.checked_add(length).ok_or(VcsError::InvalidPath)?;
                    if end > source_view.len() {
                        return Err(VcsError::InvalidPath);
                    }
                    target.extend_from_slice(&source_view[offset..end]);
                }
                1 => {
                    let offset = svndiff_int(instructions, &mut instruction_cursor)?;
                    let start = window_start
                        .checked_add(offset)
                        .ok_or(VcsError::InvalidPath)?;
                    let end = start.checked_add(length).ok_or(VcsError::InvalidPath)?;
                    if end > target.len() {
                        return Err(VcsError::InvalidPath);
                    }
                    let copied = target[start..end].to_vec();
                    target.extend_from_slice(&copied);
                }
                2 => {
                    let end = new_data_cursor
                        .checked_add(length)
                        .ok_or(VcsError::InvalidPath)?;
                    if end > new_data.len() {
                        return Err(VcsError::InvalidPath);
                    }
                    target.extend_from_slice(&new_data[new_data_cursor..end]);
                    new_data_cursor = end;
                }
                _ => return Err(VcsError::InvalidPath),
            }
        }
        if target.len() - window_start != target_length || new_data_cursor != new_data.len() {
            return Err(VcsError::InvalidPath);
        }
    }
    Ok(target)
}

pub(crate) fn svndiff0_fulltext(contents: &[u8]) -> Vec<u8> {
    let mut encoded = b"SVN\0".to_vec();
    let mut instructions = Vec::new();
    if !contents.is_empty() {
        instructions.push(0x80);
        push_svndiff_int(&mut instructions, contents.len());
    }
    for value in [0, 0, contents.len(), instructions.len(), contents.len()] {
        push_svndiff_int(&mut encoded, value);
    }
    encoded.extend_from_slice(&instructions);
    encoded.extend_from_slice(contents);
    encoded
}

fn svndiff_int(bytes: &[u8], cursor: &mut usize) -> Result<usize, VcsError> {
    let mut value = 0usize;
    loop {
        let byte = *bytes.get(*cursor).ok_or(VcsError::InvalidPath)?;
        *cursor += 1;
        value = value
            .checked_shl(7)
            .ok_or(VcsError::InvalidPath)?
            .checked_add((byte & 0x7f) as usize)
            .ok_or(VcsError::InvalidPath)?;
        if byte & 0x80 == 0 {
            return Ok(value);
        }
    }
}

fn push_svndiff_int(output: &mut Vec<u8>, value: usize) {
    let mut groups = Vec::new();
    let mut remaining = value;
    groups.push((remaining & 0x7f) as u8);
    remaining >>= 7;
    while remaining > 0 {
        groups.push((remaining & 0x7f) as u8);
        remaining >>= 7;
    }
    for (index, group) in groups.iter().rev().enumerate() {
        let has_more = index + 1 < groups.len();
        output.push(if has_more { *group | 0x80 } else { *group });
    }
}
