use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AppUsers::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AppUsers::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(AppUsers::LoginId).string().not_null())
                    .col(ColumnDef::new(AppUsers::EmailAddress).string().not_null())
                    .col(ColumnDef::new(AppUsers::DisplayName).string().not_null())
                    .col(ColumnDef::new(AppUsers::PasswordHash).string().not_null())
                    .col(ColumnDef::new(AppUsers::IsConfirmed).boolean().not_null())
                    .col(ColumnDef::new(AppUsers::IsSiteAdmin).boolean().not_null())
                    .index(
                        Index::create()
                            .name("uq-app-users-login-id")
                            .col(AppUsers::LoginId)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("uq-app-users-email-address")
                            .col(AppUsers::EmailAddress)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(DefaultLandingPreferences::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DefaultLandingPreferences::UserId)
                            .big_integer()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(DefaultLandingPreferences::Path)
                            .string()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-default-landing-preferences-user-id")
                            .from(
                                DefaultLandingPreferences::Table,
                                DefaultLandingPreferences::UserId,
                            )
                            .to(AppUsers::Table, AppUsers::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(DefaultLandingPreferences::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AppUsers::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum AppUsers {
    Table,
    Id,
    LoginId,
    EmailAddress,
    DisplayName,
    PasswordHash,
    IsConfirmed,
    IsSiteAdmin,
}

#[derive(DeriveIden)]
enum DefaultLandingPreferences {
    Table,
    UserId,
    Path,
}
