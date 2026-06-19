pub(crate) fn committed_date(svnlook_date: &str) -> String {
    let mut parts = svnlook_date.split_whitespace();
    let Some(date) = parts.next() else {
        return svnlook_date.trim().to_string();
    };
    let Some(time) = parts.next() else {
        return svnlook_date.trim().to_string();
    };
    let time = time.split_once('.').map(|(head, _)| head).unwrap_or(time);
    format!("{date}T{time}.000000Z")
}

pub(crate) fn http_date(svnlook_date: &str) -> String {
    let mut parts = svnlook_date.split_whitespace();
    let Some(date) = parts.next() else {
        return svnlook_date.trim().to_string();
    };
    let Some(time) = parts.next() else {
        return svnlook_date.trim().to_string();
    };
    let timezone = parts.next();
    let Some((year, month, day)) = parse_date_parts(date) else {
        return svnlook_date.trim().to_string();
    };
    let Some((hour, minute, second)) = parse_time_parts(time) else {
        return svnlook_date.trim().to_string();
    };
    let local_seconds = days_from_civil(year, month, day)
        .saturating_mul(86_400)
        .saturating_add(i64::from(hour) * 3_600 + i64::from(minute) * 60 + i64::from(second));
    let offset_seconds = timezone.and_then(parse_timezone_offset).unwrap_or_default();
    let utc_seconds = local_seconds.saturating_sub(offset_seconds);
    let days = utc_seconds.div_euclid(86_400);
    let seconds_of_day = utc_seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let weekday = weekdays[(days + 4).rem_euclid(7) as usize];
    let month_name = months[(month - 1) as usize];
    format!("{weekday}, {day:02} {month_name} {year:04} {hour:02}:{minute:02}:{second:02} GMT")
}

fn parse_date_parts(date: &str) -> Option<(i64, i64, i64)> {
    let mut parts = date.split('-');
    let year = parts.next()?.parse().ok()?;
    let month = parts.next()?.parse().ok()?;
    let day = parts.next()?.parse().ok()?;
    (parts.next().is_none() && (1..=12).contains(&month) && (1..=31).contains(&day))
        .then_some((year, month, day))
}

fn parse_time_parts(time: &str) -> Option<(i64, i64, i64)> {
    let time = time.split_once('.').map(|(head, _)| head).unwrap_or(time);
    let mut parts = time.split(':');
    let hour = parts.next()?.parse().ok()?;
    let minute = parts.next()?.parse().ok()?;
    let second = parts.next()?.parse().ok()?;
    (parts.next().is_none()
        && (0..=23).contains(&hour)
        && (0..=59).contains(&minute)
        && (0..=60).contains(&second))
    .then_some((hour, minute, second))
}

fn parse_timezone_offset(timezone: &str) -> Option<i64> {
    let sign: i64 = match timezone.as_bytes().first()? {
        b'+' => 1,
        b'-' => -1,
        _ => return None,
    };
    if timezone.len() != 5 {
        return None;
    }
    let hour: i64 = timezone[1..3].parse().ok()?;
    let minute: i64 = timezone[3..5].parse().ok()?;
    ((0..=23).contains(&hour) && (0..=59).contains(&minute))
        .then_some(sign * (hour * 3_600 + minute * 60))
}

fn days_from_civil(mut year: i64, month: i64, day: i64) -> i64 {
    if month <= 2 {
        year -= 1;
    }
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month_prime = month + if month > 2 { -3 } else { 9 };
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days = days + 719_468;
    let era = if days >= 0 { days } else { days - 146_096 } / 146_097;
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let mut year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    if month <= 2 {
        year += 1;
    }
    (year, month, day)
}
