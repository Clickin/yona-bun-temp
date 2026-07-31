use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use base64::{engine::general_purpose, Engine as _};
use bcrypt::verify;
use sha2::{Digest, Sha256};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum PasswordVerification {
    Bcrypt,
    LegacySha256,
    NoMatch,
}

pub(crate) fn verify_password(
    password: &str,
    password_hash: &str,
    password_salt: Option<&str>,
) -> PasswordVerification {
    if verify(password, password_hash).unwrap_or(false) {
        return PasswordVerification::Bcrypt;
    }

    let Some(password_salt) = password_salt else {
        return PasswordVerification::NoMatch;
    };

    let mut digest = Sha256::new();
    digest.update(password_salt.as_bytes());
    digest.update(password.as_bytes());
    let mut digest = digest.finalize();
    for _ in 1..1024 {
        digest = Sha256::digest(digest);
    }

    if general_purpose::STANDARD.encode(digest) == password_hash {
        PasswordVerification::LegacySha256
    } else {
        PasswordVerification::NoMatch
    }
}

pub(crate) fn hash_password_with_argon2id(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|password_hash| password_hash.to_string())
}

#[cfg(test)]
mod tests {
    use super::{verify_password, PasswordVerification};

    #[test]
    fn verifies_legacy_yona_sha256_password_hash() {
        assert_eq!(
            verify_password(
                "pass",
                "r0egKhZzB4AkoXUp9kRF1BNxv9LWeaLAhV0yhz1lgmU=",
                Some("c2FsdC1mb3ItdGVzdA=="),
            ),
            PasswordVerification::LegacySha256
        );
    }

    #[test]
    fn invalid_bcrypt_hash_is_a_normal_mismatch() {
        assert_eq!(
            verify_password("pass", "sensitive-hash-value", Some("salt")),
            PasswordVerification::NoMatch
        );
    }
}
