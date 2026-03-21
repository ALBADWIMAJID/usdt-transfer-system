| schema_name | relation_name                    | relation_type |
| ----------- | -------------------------------- | ------------- |
| public      | audit_logs                       | table         |
| public      | customers                        | table         |
| public      | fx_quotes                        | table         |
| public      | organizations                    | table         |
| public      | transfer_overpayment_resolutions | table         |
| public      | transfer_payment_voids           | table         |
| public      | transfer_payments                | table         |
| public      | transfer_reference_counters      | table         |
| public      | transfers                        | table         |
| public      | user_profiles                    | table         |
| public      | transfer_balances                | view          |





| function_schema | function_name                           | identity_arguments                           | result_type   |
| --------------- | --------------------------------------- | -------------------------------------------- | ------------- |
| public          | assign_transfer_reference_number        |                                              | trigger       |
| public          | current_org_id                          |                                              | uuid          |
| public          | lock_transfer_core_fields_after_payment |                                              | trigger       |
| public          | next_transfer_reference_number          | reference_timestamp timestamp with time zone | text          |
| public          | refresh_transfer_status                 | p_transfer_id uuid                           | void          |
| public          | rls_auto_enable                         |                                              | event_trigger |

-- 1. Relevant relations and columns


| table_schema | table_name                       | ordinal_position | column_name                  | data_type                | udt_name    | is_nullable | column_default                         |
| ------------ | -------------------------------- | ---------------- | ---------------------------- | ------------------------ | ----------- | ----------- | -------------------------------------- |
| public       | audit_logs                       | 1                | id                           | bigint                   | int8        | NO          | nextval('audit_logs_id_seq'::regclass) |
| public       | audit_logs                       | 2                | org_id                       | uuid                     | uuid        | NO          | null                                   |
| public       | audit_logs                       | 3                | actor_user_id                | uuid                     | uuid        | YES         | null                                   |
| public       | audit_logs                       | 4                | entity_type                  | text                     | text        | NO          | null                                   |
| public       | audit_logs                       | 5                | entity_id                    | uuid                     | uuid        | YES         | null                                   |
| public       | audit_logs                       | 6                | action                       | text                     | text        | NO          | null                                   |
| public       | audit_logs                       | 7                | old_data                     | jsonb                    | jsonb       | YES         | null                                   |
| public       | audit_logs                       | 8                | new_data                     | jsonb                    | jsonb       | YES         | null                                   |
| public       | audit_logs                       | 9                | created_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | customers                        | 1                | id                           | uuid                     | uuid        | NO          | gen_random_uuid()                      |
| public       | customers                        | 2                | org_id                       | uuid                     | uuid        | NO          | null                                   |
| public       | customers                        | 3                | full_name                    | text                     | text        | NO          | null                                   |
| public       | customers                        | 4                | phone                        | text                     | text        | YES         | null                                   |
| public       | customers                        | 5                | notes                        | text                     | text        | YES         | null                                   |
| public       | customers                        | 6                | is_active                    | boolean                  | bool        | NO          | true                                   |
| public       | customers                        | 7                | created_by                   | uuid                     | uuid        | YES         | null                                   |
| public       | customers                        | 8                | created_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | customers                        | 9                | updated_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | customers                        | 10               | is_archived                  | boolean                  | bool        | NO          | false                                  |
| public       | customers                        | 11               | archived_at                  | timestamp with time zone | timestamptz | YES         | null                                   |
| public       | fx_quotes                        | 1                | id                           | uuid                     | uuid        | NO          | gen_random_uuid()                      |
| public       | fx_quotes                        | 2                | org_id                       | uuid                     | uuid        | NO          | null                                   |
| public       | fx_quotes                        | 3                | base_currency                | text                     | text        | NO          | 'USDT'::text                           |
| public       | fx_quotes                        | 4                | quote_currency               | text                     | text        | NO          | 'RUB'::text                            |
| public       | fx_quotes                        | 5                | market_rate                  | numeric                  | numeric     | NO          | null                                   |
| public       | fx_quotes                        | 6                | source_name                  | text                     | text        | NO          | 'manual'::text                         |
| public       | fx_quotes                        | 7                | fetched_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | fx_quotes                        | 8                | created_by                   | uuid                     | uuid        | YES         | null                                   |
| public       | fx_quotes                        | 9                | created_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | organizations                    | 1                | id                           | uuid                     | uuid        | NO          | gen_random_uuid()                      |
| public       | organizations                    | 2                | name                         | text                     | text        | NO          | null                                   |
| public       | organizations                    | 3                | owner_user_id                | uuid                     | uuid        | YES         | null                                   |
| public       | organizations                    | 4                | created_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | transfer_overpayment_resolutions | 1                | id                           | uuid                     | uuid        | NO          | gen_random_uuid()                      |
| public       | transfer_overpayment_resolutions | 2                | transfer_id                  | uuid                     | uuid        | NO          | null                                   |
| public       | transfer_overpayment_resolutions | 3                | resolution_type              | text                     | text        | NO          | null                                   |
| public       | transfer_overpayment_resolutions | 4                | resolved_overpaid_amount_rub | numeric                  | numeric     | NO          | null                                   |
| public       | transfer_overpayment_resolutions | 5                | note                         | text                     | text        | NO          | null                                   |
| public       | transfer_overpayment_resolutions | 6                | created_at                   | timestamp with time zone | timestamptz | NO          | timezone('utc'::text, now())           |
| public       | transfer_payment_voids           | 1                | id                           | uuid                     | uuid        | NO          | gen_random_uuid()                      |
| public       | transfer_payment_voids           | 2                | payment_id                   | uuid                     | uuid        | NO          | null                                   |
| public       | transfer_payment_voids           | 3                | transfer_id                  | uuid                     | uuid        | NO          | null                                   |
| public       | transfer_payment_voids           | 4                | void_reason_type             | text                     | text        | NO          | null                                   |
| public       | transfer_payment_voids           | 5                | note                         | text                     | text        | NO          | null                                   |
| public       | transfer_payment_voids           | 6                | created_at                   | timestamp with time zone | timestamptz | NO          | timezone('utc'::text, now())           |
| public       | transfer_payments                | 1                | id                           | uuid                     | uuid        | NO          | gen_random_uuid()                      |
| public       | transfer_payments                | 2                | org_id                       | uuid                     | uuid        | NO          | null                                   |
| public       | transfer_payments                | 3                | transfer_id                  | uuid                     | uuid        | NO          | null                                   |
| public       | transfer_payments                | 4                | amount_rub                   | numeric                  | numeric     | NO          | null                                   |
| public       | transfer_payments                | 5                | note                         | text                     | text        | YES         | null                                   |
| public       | transfer_payments                | 6                | paid_at                      | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | transfer_payments                | 7                | created_by                   | uuid                     | uuid        | YES         | null                                   |
| public       | transfer_payments                | 8                | created_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | transfer_payments                | 9                | payment_method               | text                     | text        | YES         | 'Other bank'::text                     |
| public       | transfer_reference_counters      | 1                | reference_year               | integer                  | int4        | NO          | null                                   |
| public       | transfer_reference_counters      | 2                | last_number                  | integer                  | int4        | NO          | 0                                      |
| public       | transfer_reference_counters      | 3                | updated_at                   | timestamp with time zone | timestamptz | NO          | timezone('utc'::text, now())           |
| public       | transfers                        | 1                | id                           | uuid                     | uuid        | NO          | gen_random_uuid()                      |
| public       | transfers                        | 2                | org_id                       | uuid                     | uuid        | NO          | null                                   |
| public       | transfers                        | 3                | customer_id                  | uuid                     | uuid        | NO          | null                                   |
| public       | transfers                        | 4                | fx_quote_id                  | uuid                     | uuid        | YES         | null                                   |
| public       | transfers                        | 5                | usdt_amount                  | numeric                  | numeric     | NO          | null                                   |
| public       | transfers                        | 6                | market_rate                  | numeric                  | numeric     | NO          | null                                   |
| public       | transfers                        | 7                | client_rate                  | numeric                  | numeric     | YES         | null                                   |
| public       | transfers                        | 8                | pricing_mode                 | text                     | text        | NO          | null                                   |
| public       | transfers                        | 9                | commission_pct               | numeric                  | numeric     | NO          | 0                                      |
| public       | transfers                        | 10               | commission_rub               | numeric                  | numeric     | NO          | 0                                      |
| public       | transfers                        | 11               | gross_rub                    | numeric                  | numeric     | NO          | null                                   |
| public       | transfers                        | 12               | payable_rub                  | numeric                  | numeric     | NO          | null                                   |
| public       | transfers                        | 13               | status                       | text                     | text        | NO          | 'open'::text                           |
| public       | transfers                        | 14               | notes                        | text                     | text        | YES         | null                                   |
| public       | transfers                        | 15               | created_by                   | uuid                     | uuid        | YES         | null                                   |
| public       | transfers                        | 16               | created_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | transfers                        | 17               | updated_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | transfers                        | 18               | reference_number             | text                     | text        | NO          | null                                   |
| public       | user_profiles                    | 1                | user_id                      | uuid                     | uuid        | NO          | null                                   |
| public       | user_profiles                    | 2                | org_id                       | uuid                     | uuid        | NO          | null                                   |
| public       | user_profiles                    | 3                | full_name                    | text                     | text        | YES         | null                                   |
| public       | user_profiles                    | 4                | role                         | text                     | text        | NO          | 'owner'::text                          |
| public       | user_profiles                    | 5                | is_active                    | boolean                  | bool        | NO          | true                                   |
| public       | user_profiles                    | 6                | created_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |
| public       | user_profiles                    | 7                | updated_at                   | timestamp with time zone | timestamptz | NO          | now()                                  |

-- 2. Public views and materialized views


| schemaname | viewname          | definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public     | transfer_balances |  SELECT t.id,
    t.org_id,
    t.customer_id,
    t.usdt_amount,
    t.market_rate,
    t.client_rate,
    t.pricing_mode,
    t.commission_pct,
    t.commission_rub,
    t.gross_rub,
    t.payable_rub,
    (COALESCE(sum(tp.amount_rub), (0)::numeric))::numeric(18,2) AS paid_rub,
    ((t.payable_rub - COALESCE(sum(tp.amount_rub), (0)::numeric)))::numeric(18,2) AS remaining_rub,
    t.status,
    t.created_at,
    t.updated_at
   FROM (transfers t
     LEFT JOIN transfer_payments tp ON ((tp.transfer_id = t.id)))
  GROUP BY t.id; |


-- 3. Primary keys, unique constraints, checks, and foreign keys


  | table_schema | table_name                       | constraint_name                                   | constraint_type | column_name    | foreign_table_schema | foreign_table_name               | foreign_column_name |
| ------------ | -------------------------------- | ------------------------------------------------- | --------------- | -------------- | -------------------- | -------------------------------- | ------------------- |
| public       | audit_logs                       | 2200_17660_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | audit_logs                       | 2200_17660_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | audit_logs                       | 2200_17660_4_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | audit_logs                       | 2200_17660_6_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | audit_logs                       | 2200_17660_9_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | audit_logs                       | audit_logs_actor_user_id_fkey                     | FOREIGN KEY     | actor_user_id  | null                 | null                             | null                |
| public       | audit_logs                       | audit_logs_org_id_fkey                            | FOREIGN KEY     | org_id         | public               | organizations                    | id                  |
| public       | audit_logs                       | audit_logs_pkey                                   | PRIMARY KEY     | id             | public               | audit_logs                       | id                  |
| public       | customers                        | 2200_17535_10_not_null                            | CHECK           | null           | null                 | null                             | null                |
| public       | customers                        | 2200_17535_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | customers                        | 2200_17535_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | customers                        | 2200_17535_3_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | customers                        | 2200_17535_6_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | customers                        | 2200_17535_8_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | customers                        | 2200_17535_9_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | customers                        | customers_created_by_fkey                         | FOREIGN KEY     | created_by     | null                 | null                             | null                |
| public       | customers                        | customers_org_id_fkey                             | FOREIGN KEY     | org_id         | public               | organizations                    | id                  |
| public       | customers                        | customers_pkey                                    | PRIMARY KEY     | id             | public               | customers                        | id                  |
| public       | fx_quotes                        | 2200_17559_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | fx_quotes                        | 2200_17559_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | fx_quotes                        | 2200_17559_3_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | fx_quotes                        | 2200_17559_4_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | fx_quotes                        | 2200_17559_5_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | fx_quotes                        | 2200_17559_6_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | fx_quotes                        | 2200_17559_7_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | fx_quotes                        | 2200_17559_9_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | fx_quotes                        | fx_quotes_market_rate_check                       | CHECK           | null           | public               | fx_quotes                        | market_rate         |
| public       | fx_quotes                        | fx_quotes_created_by_fkey                         | FOREIGN KEY     | created_by     | null                 | null                             | null                |
| public       | fx_quotes                        | fx_quotes_org_id_fkey                             | FOREIGN KEY     | org_id         | public               | organizations                    | id                  |
| public       | fx_quotes                        | fx_quotes_pkey                                    | PRIMARY KEY     | id             | public               | fx_quotes                        | id                  |
| public       | organizations                    | 2200_17502_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | organizations                    | 2200_17502_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | organizations                    | 2200_17502_4_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | organizations                    | organizations_pkey                                | PRIMARY KEY     | id             | public               | organizations                    | id                  |
| public       | transfer_overpayment_resolutions | 2200_24608_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_overpayment_resolutions | 2200_24608_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_overpayment_resolutions | 2200_24608_3_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_overpayment_resolutions | 2200_24608_4_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_overpayment_resolutions | 2200_24608_5_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_overpayment_resolutions | 2200_24608_6_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_overpayment_resolutions | transfer_overpayment_resolutions_transfer_id_fkey | FOREIGN KEY     | transfer_id    | public               | transfers                        | id                  |
| public       | transfer_overpayment_resolutions | transfer_overpayment_resolutions_pkey             | PRIMARY KEY     | id             | public               | transfer_overpayment_resolutions | id                  |
| public       | transfer_payment_voids           | 2200_24623_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payment_voids           | 2200_24623_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payment_voids           | 2200_24623_3_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payment_voids           | 2200_24623_4_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payment_voids           | 2200_24623_5_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payment_voids           | 2200_24623_6_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payment_voids           | transfer_payment_voids_payment_id_fkey            | FOREIGN KEY     | payment_id     | public               | transfer_payments                | id                  |
| public       | transfer_payment_voids           | transfer_payment_voids_transfer_id_fkey           | FOREIGN KEY     | transfer_id    | public               | transfers                        | id                  |
| public       | transfer_payment_voids           | transfer_payment_voids_pkey                       | PRIMARY KEY     | id             | public               | transfer_payment_voids           | id                  |
| public       | transfer_payments                | 2200_17631_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payments                | 2200_17631_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payments                | 2200_17631_3_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payments                | 2200_17631_4_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payments                | 2200_17631_6_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payments                | 2200_17631_8_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_payments                | transfer_payments_amount_rub_check                | CHECK           | null           | public               | transfer_payments                | amount_rub          |
| public       | transfer_payments                | transfer_payments_payment_method_check            | CHECK           | null           | public               | transfer_payments                | payment_method      |
| public       | transfer_payments                | transfer_payments_created_by_fkey                 | FOREIGN KEY     | created_by     | null                 | null                             | null                |
| public       | transfer_payments                | transfer_payments_org_id_fkey                     | FOREIGN KEY     | org_id         | public               | organizations                    | id                  |
| public       | transfer_payments                | transfer_payments_transfer_id_fkey                | FOREIGN KEY     | transfer_id    | public               | transfers                        | id                  |
| public       | transfer_payments                | transfer_payments_pkey                            | PRIMARY KEY     | id             | public               | transfer_payments                | id                  |
| public       | transfer_reference_counters      | 2200_17805_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_reference_counters      | 2200_17805_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_reference_counters      | 2200_17805_3_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfer_reference_counters      | transfer_reference_counters_pkey                  | PRIMARY KEY     | reference_year | public               | transfer_reference_counters      | reference_year      |
| public       | transfers                        | 2200_17584_10_not_null                            | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_11_not_null                            | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_12_not_null                            | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_13_not_null                            | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_16_not_null                            | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_17_not_null                            | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_18_not_null                            | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_3_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_5_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_6_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_8_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | 2200_17584_9_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | transfers                        | transfers_client_rate_check                       | CHECK           | null           | public               | transfers                        | client_rate         |
| public       | transfers                        | transfers_commission_pct_check                    | CHECK           | null           | public               | transfers                        | commission_pct      |
| public       | transfers                        | transfers_commission_rub_check                    | CHECK           | null           | public               | transfers                        | commission_rub      |
| public       | transfers                        | transfers_gross_rub_check                         | CHECK           | null           | public               | transfers                        | gross_rub           |
| public       | transfers                        | transfers_market_rate_check                       | CHECK           | null           | public               | transfers                        | market_rate         |
| public       | transfers                        | transfers_payable_rub_check                       | CHECK           | null           | public               | transfers                        | payable_rub         |
| public       | transfers                        | transfers_pricing_mode_check                      | CHECK           | null           | public               | transfers                        | pricing_mode        |
| public       | transfers                        | transfers_status_check                            | CHECK           | null           | public               | transfers                        | status              |
| public       | transfers                        | transfers_usdt_amount_check                       | CHECK           | null           | public               | transfers                        | usdt_amount         |
| public       | transfers                        | transfers_created_by_fkey                         | FOREIGN KEY     | created_by     | null                 | null                             | null                |
| public       | transfers                        | transfers_customer_id_fkey                        | FOREIGN KEY     | customer_id    | public               | customers                        | id                  |
| public       | transfers                        | transfers_fx_quote_id_fkey                        | FOREIGN KEY     | fx_quote_id    | public               | fx_quotes                        | id                  |
| public       | transfers                        | transfers_org_id_fkey                             | FOREIGN KEY     | org_id         | public               | organizations                    | id                  |
| public       | transfers                        | transfers_pkey                                    | PRIMARY KEY     | id             | public               | transfers                        | id                  |
| public       | user_profiles                    | 2200_17511_1_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | user_profiles                    | 2200_17511_2_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | user_profiles                    | 2200_17511_4_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | user_profiles                    | 2200_17511_5_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | user_profiles                    | 2200_17511_6_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | user_profiles                    | 2200_17511_7_not_null                             | CHECK           | null           | null                 | null                             | null                |
| public       | user_profiles                    | user_profiles_role_check                          | CHECK           | null           | public               | user_profiles                    | role                |
| public       | user_profiles                    | user_profiles_org_id_fkey                         | FOREIGN KEY     | org_id         | public               | organizations                    | id                  |
| public       | user_profiles                    | user_profiles_user_id_fkey                        | FOREIGN KEY     | user_id        | null                 | null                             | null                |
| public       | user_profiles                    | user_profiles_pkey                                | PRIMARY KEY     | user_id        | public               | user_profiles                    | user_id             |

-- 4. Foreign-key update/delete rules


| table_name                       | constraint_name                                   | column_name | foreign_table_name | foreign_column_name | update_rule | delete_rule |
| -------------------------------- | ------------------------------------------------- | ----------- | ------------------ | ------------------- | ----------- | ----------- |
| audit_logs                       | audit_logs_org_id_fkey                            | org_id      | organizations      | id                  | NO ACTION   | CASCADE     |
| customers                        | customers_org_id_fkey                             | org_id      | organizations      | id                  | NO ACTION   | CASCADE     |
| fx_quotes                        | fx_quotes_org_id_fkey                             | org_id      | organizations      | id                  | NO ACTION   | CASCADE     |
| transfer_overpayment_resolutions | transfer_overpayment_resolutions_transfer_id_fkey | transfer_id | transfers          | id                  | NO ACTION   | RESTRICT    |
| transfer_payment_voids           | transfer_payment_voids_payment_id_fkey            | payment_id  | transfer_payments  | id                  | NO ACTION   | RESTRICT    |
| transfer_payment_voids           | transfer_payment_voids_transfer_id_fkey           | transfer_id | transfers          | id                  | NO ACTION   | RESTRICT    |
| transfer_payments                | transfer_payments_org_id_fkey                     | org_id      | organizations      | id                  | NO ACTION   | CASCADE     |
| transfer_payments                | transfer_payments_transfer_id_fkey                | transfer_id | transfers          | id                  | NO ACTION   | CASCADE     |
| transfers                        | transfers_customer_id_fkey                        | customer_id | customers          | id                  | NO ACTION   | RESTRICT    |
| transfers                        | transfers_fx_quote_id_fkey                        | fx_quote_id | fx_quotes          | id                  | NO ACTION   | SET NULL    |
| transfers                        | transfers_org_id_fkey                             | org_id      | organizations      | id                  | NO ACTION   | CASCADE     |
| user_profiles                    | user_profiles_org_id_fkey                         | org_id      |
 organizations      | id                  | NO ACTION   | CASCADE     |


-- 5. Indexes


 | schemaname | tablename                        | indexname                                             | indexdef                                                                                                                                                 |
| ---------- | -------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public     | audit_logs                       | audit_logs_pkey                                       | CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)                                                                                |
| public     | audit_logs                       | idx_audit_logs_org_created_at                         | CREATE INDEX idx_audit_logs_org_created_at ON public.audit_logs USING btree (org_id, created_at DESC)                                                    |
| public     | customers                        | customers_is_archived_full_name_idx                   | CREATE INDEX customers_is_archived_full_name_idx ON public.customers USING btree (is_archived, full_name)                                                |
| public     | customers                        | customers_pkey                                        | CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id)                                                                                  |
| public     | customers                        | idx_customers_full_name                               | CREATE INDEX idx_customers_full_name ON public.customers USING btree (full_name)                                                                         |
| public     | customers                        | idx_customers_org_id                                  | CREATE INDEX idx_customers_org_id ON public.customers USING btree (org_id)                                                                               |
| public     | fx_quotes                        | fx_quotes_pkey                                        | CREATE UNIQUE INDEX fx_quotes_pkey ON public.fx_quotes USING btree (id)                                                                                  |
| public     | fx_quotes                        | idx_fx_quotes_org_fetched_at                          | CREATE INDEX idx_fx_quotes_org_fetched_at ON public.fx_quotes USING btree (org_id, fetched_at DESC)                                                      |
| public     | organizations                    | organizations_pkey                                    | CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id)                                                                          |
| public     | transfer_overpayment_resolutions | transfer_overpayment_resolutions_pkey                 | CREATE UNIQUE INDEX transfer_overpayment_resolutions_pkey ON public.transfer_overpayment_resolutions USING btree (id)                                    |
| public     | transfer_overpayment_resolutions | transfer_overpayment_resolutions_transfer_created_idx | CREATE INDEX transfer_overpayment_resolutions_transfer_created_idx ON public.transfer_overpayment_resolutions USING btree (transfer_id, created_at DESC) |
| public     | transfer_payment_voids           | transfer_payment_voids_payment_id_key                 | CREATE UNIQUE INDEX transfer_payment_voids_payment_id_key ON public.transfer_payment_voids USING btree (payment_id)                                      |
| public     | transfer_payment_voids           | transfer_payment_voids_pkey                           | CREATE UNIQUE INDEX transfer_payment_voids_pkey ON public.transfer_payment_voids USING btree (id)                                                        |
| public     | transfer_payment_voids           | transfer_payment_voids_transfer_created_idx           | CREATE INDEX transfer_payment_voids_transfer_created_idx ON public.transfer_payment_voids USING btree (transfer_id, created_at DESC)                     |
| public     | transfer_payments                | idx_transfer_payments_paid_at                         | CREATE INDEX idx_transfer_payments_paid_at ON public.transfer_payments USING btree (paid_at DESC)                                                        |
| public     | transfer_payments                | idx_transfer_payments_transfer_id                     | CREATE INDEX idx_transfer_payments_transfer_id ON public.transfer_payments USING btree (transfer_id)                                                     |
| public     | transfer_payments                | transfer_payments_pkey                                | CREATE UNIQUE INDEX transfer_payments_pkey ON public.transfer_payments USING btree (id)                                                                  |
| public     | transfer_reference_counters      | transfer_reference_counters_pkey                      | CREATE UNIQUE INDEX transfer_reference_counters_pkey ON public.transfer_reference_counters USING btree (reference_year)                                  |
| public     | transfers                        | idx_transfers_created_at                              | CREATE INDEX idx_transfers_created_at ON public.transfers USING btree (created_at DESC)                                                                  |
| public     | transfers                        | idx_transfers_customer_id                             | CREATE INDEX idx_transfers_customer_id ON public.transfers USING btree (customer_id)                                                                     |
| public     | transfers                        | idx_transfers_org_id                                  | CREATE INDEX idx_transfers_org_id ON public.transfers USING btree (org_id)                                                                               |
| public     | transfers                        | idx_transfers_status                                  | CREATE INDEX idx_transfers_status ON public.transfers USING btree (status)                                                                               |
| public     | transfers                        | transfers_pkey                                        | CREATE UNIQUE INDEX transfers_pkey ON public.transfers USING btree (id)                                                                                  |
| public     | transfers                        | transfers_reference_number_key                        | CREATE UNIQUE INDEX transfers_reference_number_key ON public.transfers USING btree (reference_number)                                                    |
| public     | user_profiles                    | user_profiles_pkey                                    | CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (user_id)                                                                     |



-- 6. RLS enabled / forced flags



| table_schema | table_name                       | rls_enabled | rls_forced |
| ------------ | -------------------------------- | ----------- | ---------- |
| public       | audit_logs                       | true        | false      |
| public       | customers                        | true        | false      |
| public       | fx_quotes                        | true        | false      |
| public       | organizations                    | true        | false      |
| public       | transfer_overpayment_resolutions | true        | false      |
| public       | transfer_payment_voids           | true        | false      |
| public       | transfer_payments                | true        | false      |
| public       | transfer_reference_counters      | true        | false      |
| public       | transfers                        | true        | false      |
| public       | user_profiles                    | true        | false      |


-- 7. RLS policies


| schemaname | tablename                        | policyname                                            | permissive | roles           | cmd    | qual                        | with_check                                                     |
| ---------- | -------------------------------- | ----------------------------------------------------- | ---------- | --------------- | ------ | --------------------------- | -------------------------------------------------------------- |
| public     | audit_logs                       | audit_logs_insert_same_org                            | PERMISSIVE | {authenticated} | INSERT | null                        | ((org_id = current_org_id()) AND (actor_user_id = auth.uid())) |
| public     | audit_logs                       | audit_logs_select_same_org                            | PERMISSIVE | {public}        | SELECT | (org_id = current_org_id()) | null                                                           |
| public     | customers                        | customers_all_same_org                                | PERMISSIVE | {public}        | ALL    | (org_id = current_org_id()) | (org_id = current_org_id())                                    |
| public     | fx_quotes                        | fx_quotes_all_same_org                                | PERMISSIVE | {public}        | ALL    | (org_id = current_org_id()) | (org_id = current_org_id())                                    |
| public     | organizations                    | org_select_own                                        | PERMISSIVE | {public}        | SELECT | (id = current_org_id())     | null                                                           |
| public     | transfer_overpayment_resolutions | authenticated_insert_transfer_overpayment_resolutions | PERMISSIVE | {authenticated} | INSERT | null                        | true                                                           |
| public     | transfer_overpayment_resolutions | authenticated_select_transfer_overpayment_resolutions | PERMISSIVE | {authenticated} | SELECT | true                        | null                                                           |
| public     | transfer_payment_voids           | authenticated_insert_transfer_payment_voids           | PERMISSIVE | {authenticated} | INSERT | null                        | true                                                           |
| public     | transfer_payment_voids           | authenticated_select_transfer_payment_voids           | PERMISSIVE | {authenticated} | SELECT | true                        | null                                                           |
| public     | transfer_payments                | payments_all_same_org                                 | PERMISSIVE | {public}        | ALL    | (org_id = current_org_id()) | (org_id = current_org_id())                                    |
| public     | transfers                        | transfers_all_same_org                                | PERMISSIVE | {public}        | ALL    | (org_id = current_org_id()) | (org_id = current_org_id())                                    |
| public     | user_profiles                    | profiles_select_own                                   | PERMISSIVE | {public}        | SELECT | (user_id = auth.uid())      | null                                                           |
| public     | user_profiles                    | profiles_update_self                                  | PERMISSIVE | {public}        | UPDATE | (user_id = auth.uid())      | (user_id = auth.uid())                                         |

-- 8. Table and view grants


| table_schema | table_name                       | grantee       | privilege_type |
| ------------ | -------------------------------- | ------------- | -------------- |
| public       | audit_logs                       | anon          | DELETE         |
| public       | audit_logs                       | anon          | INSERT         |
| public       | audit_logs                       | anon          | REFERENCES     |
| public       | audit_logs                       | anon          | SELECT         |
| public       | audit_logs                       | anon          | TRIGGER        |
| public       | audit_logs                       | anon          | TRUNCATE       |
| public       | audit_logs                       | anon          | UPDATE         |
| public       | audit_logs                       | authenticated | DELETE         |
| public       | audit_logs                       | authenticated | INSERT         |
| public       | audit_logs                       | authenticated | REFERENCES     |
| public       | audit_logs                       | authenticated | SELECT         |
| public       | audit_logs                       | authenticated | TRIGGER        |
| public       | audit_logs                       | authenticated | TRUNCATE       |
| public       | audit_logs                       | authenticated | UPDATE         |
| public       | audit_logs                       | postgres      | DELETE         |
| public       | audit_logs                       | postgres      | INSERT         |
| public       | audit_logs                       | postgres      | REFERENCES     |
| public       | audit_logs                       | postgres      | SELECT         |
| public       | audit_logs                       | postgres      | TRIGGER        |
| public       | audit_logs                       | postgres      | TRUNCATE       |
| public       | audit_logs                       | postgres      | UPDATE         |
| public       | audit_logs                       | service_role  | DELETE         |
| public       | audit_logs                       | service_role  | INSERT         |
| public       | audit_logs                       | service_role  | REFERENCES     |
| public       | audit_logs                       | service_role  | SELECT         |
| public       | audit_logs                       | service_role  | TRIGGER        |
| public       | audit_logs                       | service_role  | TRUNCATE       |
| public       | audit_logs                       | service_role  | UPDATE         |
| public       | customers                        | anon          | DELETE         |
| public       | customers                        | anon          | INSERT         |
| public       | customers                        | anon          | REFERENCES     |
| public       | customers                        | anon          | SELECT         |
| public       | customers                        | anon          | TRIGGER        |
| public       | customers                        | anon          | TRUNCATE       |
| public       | customers                        | anon          | UPDATE         |
| public       | customers                        | authenticated | DELETE         |
| public       | customers                        | authenticated | INSERT         |
| public       | customers                        | authenticated | REFERENCES     |
| public       | customers                        | authenticated | SELECT         |
| public       | customers                        | authenticated | TRIGGER        |
| public       | customers                        | authenticated | TRUNCATE       |
| public       | customers                        | authenticated | UPDATE         |
| public       | customers                        | postgres      | DELETE         |
| public       | customers                        | postgres      | INSERT         |
| public       | customers                        | postgres      | REFERENCES     |
| public       | customers                        | postgres      | SELECT         |
| public       | customers                        | postgres      | TRIGGER        |
| public       | customers                        | postgres      | TRUNCATE       |
| public       | customers                        | postgres      | UPDATE         |
| public       | customers                        | service_role  | DELETE         |
| public       | customers                        | service_role  | INSERT         |
| public       | customers                        | service_role  | REFERENCES     |
| public       | customers                        | service_role  | SELECT         |
| public       | customers                        | service_role  | TRIGGER        |
| public       | customers                        | service_role  | TRUNCATE       |
| public       | customers                        | service_role  | UPDATE         |
| public       | fx_quotes                        | anon          | DELETE         |
| public       | fx_quotes                        | anon          | INSERT         |
| public       | fx_quotes                        | anon          | REFERENCES     |
| public       | fx_quotes                        | anon          | SELECT         |
| public       | fx_quotes                        | anon          | TRIGGER        |
| public       | fx_quotes                        | anon          | TRUNCATE       |
| public       | fx_quotes                        | anon          | UPDATE         |
| public       | fx_quotes                        | authenticated | DELETE         |
| public       | fx_quotes                        | authenticated | INSERT         |
| public       | fx_quotes                        | authenticated | REFERENCES     |
| public       | fx_quotes                        | authenticated | SELECT         |
| public       | fx_quotes                        | authenticated | TRIGGER        |
| public       | fx_quotes                        | authenticated | TRUNCATE       |
| public       | fx_quotes                        | authenticated | UPDATE         |
| public       | fx_quotes                        | postgres      | DELETE         |
| public       | fx_quotes                        | postgres      | INSERT         |
| public       | fx_quotes                        | postgres      | REFERENCES     |
| public       | fx_quotes                        | postgres      | SELECT         |
| public       | fx_quotes                        | postgres      | TRIGGER        |
| public       | fx_quotes                        | postgres      | TRUNCATE       |
| public       | fx_quotes                        | postgres      | UPDATE         |
| public       | fx_quotes                        | service_role  | DELETE         |
| public       | fx_quotes                        | service_role  | INSERT         |
| public       | fx_quotes                        | service_role  | REFERENCES     |
| public       | fx_quotes                        | service_role  | SELECT         |
| public       | fx_quotes                        | service_role  | TRIGGER        |
| public       | fx_quotes                        | service_role  | TRUNCATE       |
| public       | fx_quotes                        | service_role  | UPDATE         |
| public       | organizations                    | anon          | DELETE         |
| public       | organizations                    | anon          | INSERT         |
| public       | organizations                    | anon          | REFERENCES     |
| public       | organizations                    | anon          | SELECT         |
| public       | organizations                    | anon          | TRIGGER        |
| public       | organizations                    | anon          | TRUNCATE       |
| public       | organizations                    | anon          | UPDATE         |
| public       | organizations                    | authenticated | DELETE         |
| public       | organizations                    | authenticated | INSERT         |
| public       | organizations                    | authenticated | REFERENCES     |
| public       | organizations                    | authenticated | SELECT         |
| public       | organizations                    | authenticated | TRIGGER        |
| public       | organizations                    | authenticated | TRUNCATE       |
| public       | organizations                    | authenticated | UPDATE         |
| public       | organizations                    | postgres      | DELETE         |
| public       | organizations                    | postgres      | INSERT         |
| public       | organizations                    | postgres      | REFERENCES     |
| public       | organizations                    | postgres      | SELECT         |
| public       | organizations                    | postgres      | TRIGGER        |
| public       | organizations                    | postgres      | TRUNCATE       |
| public       | organizations                    | postgres      | UPDATE         |
| public       | organizations                    | service_role  | DELETE         |
| public       | organizations                    | service_role  | INSERT         |
| public       | organizations                    | service_role  | REFERENCES     |
| public       | organizations                    | service_role  | SELECT         |
| public       | organizations                    | service_role  | TRIGGER        |
| public       | organizations                    | service_role  | TRUNCATE       |
| public       | organizations                    | service_role  | UPDATE         |
| public       | transfer_balances                | anon          | DELETE         |
| public       | transfer_balances                | anon          | INSERT         |
| public       | transfer_balances                | anon          | REFERENCES     |
| public       | transfer_balances                | anon          | SELECT         |
| public       | transfer_balances                | anon          | TRIGGER        |
| public       | transfer_balances                | anon          | TRUNCATE       |
| public       | transfer_balances                | anon          | UPDATE         |
| public       | transfer_balances                | authenticated | DELETE         |
| public       | transfer_balances                | authenticated | INSERT         |
| public       | transfer_balances                | authenticated | REFERENCES     |
| public       | transfer_balances                | authenticated | SELECT         |
| public       | transfer_balances                | authenticated | TRIGGER        |
| public       | transfer_balances                | authenticated | TRUNCATE       |
| public       | transfer_balances                | authenticated | UPDATE         |
| public       | transfer_balances                | postgres      | DELETE         |
| public       | transfer_balances                | postgres      | INSERT         |
| public       | transfer_balances                | postgres      | REFERENCES     |
| public       | transfer_balances                | postgres      | SELECT         |
| public       | transfer_balances                | postgres      | TRIGGER        |
| public       | transfer_balances                | postgres      | TRUNCATE       |
| public       | transfer_balances                | postgres      | UPDATE         |
| public       | transfer_balances                | service_role  | DELETE         |
| public       | transfer_balances                | service_role  | INSERT         |
| public       | transfer_balances                | service_role  | REFERENCES     |
| public       | transfer_balances                | service_role  | SELECT         |
| public       | transfer_balances                | service_role  | TRIGGER        |
| public       | transfer_balances                | service_role  | TRUNCATE       |
| public       | transfer_balances                | service_role  | UPDATE         |
| public       | transfer_overpayment_resolutions | anon          | DELETE         |
| public       | transfer_overpayment_resolutions | anon          | INSERT         |
| public       | transfer_overpayment_resolutions | anon          | REFERENCES     |
| public       | transfer_overpayment_resolutions | anon          | SELECT         |
| public       | transfer_overpayment_resolutions | anon          | TRIGGER        |
| public       | transfer_overpayment_resolutions | anon          | TRUNCATE       |
| public       | transfer_overpayment_resolutions | anon          | UPDATE         |
| public       | transfer_overpayment_resolutions | authenticated | DELETE         |
| public       | transfer_overpayment_resolutions | authenticated | INSERT         |
| public       | transfer_overpayment_resolutions | authenticated | REFERENCES     |
| public       | transfer_overpayment_resolutions | authenticated | SELECT         |
| public       | transfer_overpayment_resolutions | authenticated | TRIGGER        |
| public       | transfer_overpayment_resolutions | authenticated | TRUNCATE       |
| public       | transfer_overpayment_resolutions | authenticated | UPDATE         |
| public       | transfer_overpayment_resolutions | postgres      | DELETE         |
| public       | transfer_overpayment_resolutions | postgres      | INSERT         |
| public       | transfer_overpayment_resolutions | postgres      | REFERENCES     |
| public       | transfer_overpayment_resolutions | postgres      | SELECT         |
| public       | transfer_overpayment_resolutions | postgres      | TRIGGER        |
| public       | transfer_overpayment_resolutions | postgres      | TRUNCATE       |
| public       | transfer_overpayment_resolutions | postgres      | UPDATE         |
| public       | transfer_overpayment_resolutions | service_role  | DELETE         |
| public       | transfer_overpayment_resolutions | service_role  | INSERT         |
| public       | transfer_overpayment_resolutions | service_role  | REFERENCES     |
| public       | transfer_overpayment_resolutions | service_role  | SELECT         |
| public       | transfer_overpayment_resolutions | service_role  | TRIGGER        |
| public       | transfer_overpayment_resolutions | service_role  | TRUNCATE       |
| public       | transfer_overpayment_resolutions | service_role  | UPDATE         |
| public       | transfer_payment_voids           | anon          | DELETE         |
| public       | transfer_payment_voids           | anon          | INSERT         |
| public       | transfer_payment_voids           | anon          | REFERENCES     |
| public       | transfer_payment_voids           | anon          | SELECT         |
| public       | transfer_payment_voids           | anon          | TRIGGER        |
| public       | transfer_payment_voids           | anon          | TRUNCATE       |
| public       | transfer_payment_voids           | anon          | UPDATE         |
| public       | transfer_payment_voids           | authenticated | DELETE         |
| public       | transfer_payment_voids           | authenticated | INSERT         |
| public       | transfer_payment_voids           | authenticated | REFERENCES     |
| public       | transfer_payment_voids           | authenticated | SELECT         |
| public       | transfer_payment_voids           | authenticated | TRIGGER        |
| public       | transfer_payment_voids           | authenticated | TRUNCATE       |
| public       | transfer_payment_voids           | authenticated | UPDATE         |
| public       | transfer_payment_voids           | postgres      | DELETE         |
| public       | transfer_payment_voids           | postgres      | INSERT         |
| public       | transfer_payment_voids           | postgres      | REFERENCES     |
| public       | transfer_payment_voids           | postgres      | SELECT         |
| public       | transfer_payment_voids           | postgres      | TRIGGER        |
| public       | transfer_payment_voids           | postgres      | TRUNCATE       |
| public       | transfer_payment_voids           | postgres      | UPDATE         |
| public       | transfer_payment_voids           | service_role  | DELETE         |
| public       | transfer_payment_voids           | service_role  | INSERT         |
| public       | transfer_payment_voids           | service_role  | REFERENCES     |
| public       | transfer_payment_voids           | service_role  | SELECT         |
| public       | transfer_payment_voids           | service_role  | TRIGGER        |
| public       | transfer_payment_voids           | service_role  | TRUNCATE       |
| public       | transfer_payment_voids           | service_role  | UPDATE         |
| public       | transfer_payments                | anon          | DELETE         |
| public       | transfer_payments                | anon          | INSERT         |
| public       | transfer_payments                | anon          | REFERENCES     |
| public       | transfer_payments                | anon          | SELECT         |
| public       | transfer_payments                | anon          | TRIGGER        |
| public       | transfer_payments                | anon          | TRUNCATE       |
| public       | transfer_payments                | anon          | UPDATE         |
| public       | transfer_payments                | authenticated | DELETE         |
| public       | transfer_payments                | authenticated | INSERT         |
| public       | transfer_payments                | authenticated | REFERENCES     |
| public       | transfer_payments                | authenticated | SELECT         |
| public       | transfer_payments                | authenticated | TRIGGER        |
| public       | transfer_payments                | authenticated | TRUNCATE       |
| public       | transfer_payments                | authenticated | UPDATE         |
| public       | transfer_payments                | postgres      | DELETE         |
| public       | transfer_payments                | postgres      | INSERT         |
| public       | transfer_payments                | postgres      | REFERENCES     |
| public       | transfer_payments                | postgres      | SELECT         |
| public       | transfer_payments                | postgres      | TRIGGER        |
| public       | transfer_payments                | postgres      | TRUNCATE       |
| public       | transfer_payments                | postgres      | UPDATE         |
| public       | transfer_payments                | service_role  | DELETE         |
| public       | transfer_payments                | service_role  | INSERT         |
| public       | transfer_payments                | service_role  | REFERENCES     |
| public       | transfer_payments                | service_role  | SELECT         |
| public       | transfer_payments                | service_role  | TRIGGER        |
| public       | transfer_payments                | service_role  | TRUNCATE       |
| public       | transfer_payments                | service_role  | UPDATE         |
| public       | transfer_reference_counters      | anon          | DELETE         |
| public       | transfer_reference_counters      | anon          | INSERT         |
| public       | transfer_reference_counters      | anon          | REFERENCES     |
| public       | transfer_reference_counters      | anon          | SELECT         |
| public       | transfer_reference_counters      | anon          | TRIGGER        |
| public       | transfer_reference_counters      | anon          | TRUNCATE       |
| public       | transfer_reference_counters      | anon          | UPDATE         |
| public       | transfer_reference_counters      | authenticated | DELETE         |
| public       | transfer_reference_counters      | authenticated | INSERT         |
| public       | transfer_reference_counters      | authenticated | REFERENCES     |
| public       | transfer_reference_counters      | authenticated | SELECT         |
| public       | transfer_reference_counters      | authenticated | TRIGGER        |
| public       | transfer_reference_counters      | authenticated | TRUNCATE       |
| public       | transfer_reference_counters      | authenticated | UPDATE         |
| public       | transfer_reference_counters      | postgres      | DELETE         |
| public       | transfer_reference_counters      | postgres      | INSERT         |
| public       | transfer_reference_counters      | postgres      | REFERENCES     |
| public       | transfer_reference_counters      | postgres      | SELECT         |
| public       | transfer_reference_counters      | postgres      | TRIGGER        |
| public       | transfer_reference_counters      | postgres      | TRUNCATE       |
| public       | transfer_reference_counters      | postgres      | UPDATE         |
| public       | transfer_reference_counters      | service_role  | DELETE         |
| public       | transfer_reference_counters      | service_role  | INSERT         |
| public       | transfer_reference_counters      | service_role  | REFERENCES     |
| public       | transfer_reference_counters      | service_role  | SELECT         |
| public       | transfer_reference_counters      | service_role  | TRIGGER        |
| public       | transfer_reference_counters      | service_role  | TRUNCATE       |
| public       | transfer_reference_counters      | service_role  | UPDATE         |
| public       | transfers                        | anon          | DELETE         |
| public       | transfers                        | anon          | INSERT         |
| public       | transfers                        | anon          | REFERENCES     |
| public       | transfers                        | anon          | SELECT         |
| public       | transfers                        | anon          | TRIGGER        |
| public       | transfers                        | anon          | TRUNCATE       |
| public       | transfers                        | anon          | UPDATE         |
| public       | transfers                        | authenticated | DELETE         |
| public       | transfers                        | authenticated | INSERT         |
| public       | transfers                        | authenticated | REFERENCES     |
| public       | transfers                        | authenticated | SELECT         |
| public       | transfers                        | authenticated | TRIGGER        |
| public       | transfers                        | authenticated | TRUNCATE       |
| public       | transfers                        | authenticated | UPDATE         |
| public       | transfers                        | postgres      | DELETE         |
| public       | transfers                        | postgres      | INSERT         |
| public       | transfers                        | postgres      | REFERENCES     |
| public       | transfers                        | postgres      | SELECT         |
| public       | transfers                        | postgres      | TRIGGER        |
| public       | transfers                        | postgres      | TRUNCATE       |
| public       | transfers                        | postgres      | UPDATE         |
| public       | transfers                        | service_role  | DELETE         |
| public       | transfers                        | service_role  | INSERT         |
| public       | transfers                        | service_role  | REFERENCES     |
| public       | transfers                        | service_role  | SELECT         |
| public       | transfers                        | service_role  | TRIGGER        |
| public       | transfers                        | service_role  | TRUNCATE       |
| public       | transfers                        | service_role  | UPDATE         |
| public       | user_profiles                    | anon          | DELETE         |
| public       | user_profiles                    | anon          | INSERT         |
| public       | user_profiles                    | anon          | REFERENCES     |
| public       | user_profiles                    | anon          | SELECT         |
| public       | user_profiles                    | anon          | TRIGGER        |
| public       | user_profiles                    | anon          | TRUNCATE       |
| public       | user_profiles                    | anon          | UPDATE         |
| public       | user_profiles                    | authenticated | DELETE         |
| public       | user_profiles                    | authenticated | INSERT         |
| public       | user_profiles                    | authenticated | REFERENCES     |
| public       | user_profiles                    | authenticated | SELECT         |
| public       | user_profiles                    | authenticated | TRIGGER        |
| public       | user_profiles                    | authenticated | TRUNCATE       |
| public       | user_profiles                    | authenticated | UPDATE         |
| public       | user_profiles                    | postgres      | DELETE         |
| public       | user_profiles                    | postgres      | INSERT         |
| public       | user_profiles                    | postgres      | REFERENCES     |
| public       | user_profiles                    | postgres      | SELECT         |
| public       | user_profiles                    | postgres      | TRIGGER        |
| public       | user_profiles                    | postgres      | TRUNCATE       |
| public       | user_profiles                    | postgres      | UPDATE         |
| public       | user_profiles                    | service_role  | DELETE         |
| public       | user_profiles                    | service_role  | INSERT         |
| public       | user_profiles                    | service_role  | REFERENCES     |
| public       | user_profiles                    | service_role  | SELECT         |
| public       | user_profiles                    | service_role  | TRIGGER        |
| public       | user_profiles                    | service_role  | TRUNCATE       |
| public       | user_profiles                    | service_role  | UPDATE         |


| function_schema | function_name                           | identity_arguments                           | result_type   | security_definer | function_def                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------- | --------------------------------------- | -------------------------------------------- | ------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public          | assign_transfer_reference_number        |                                              | trigger       | true             | CREATE OR REPLACE FUNCTION public.assign_transfer_reference_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(trim(new.reference_number), '') = '' then
    new.reference_number :=
      public.next_transfer_reference_number(coalesce(new.created_at, timezone('utc', now())));
  end if;

  return new;
end;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| public          | current_org_id                          |                                              | uuid          | false            | CREATE OR REPLACE FUNCTION public.current_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select org_id
  from public.user_profiles
  where user_id = auth.uid()
  limit 1;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| public          | lock_transfer_core_fields_after_payment |                                              | trigger       | true             | CREATE OR REPLACE FUNCTION public.lock_transfer_core_fields_after_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists (
    select 1
    from public.transfer_payments
    where transfer_id = old.id
  ) then
    if new.customer_id is distinct from old.customer_id
      or new.usdt_amount is distinct from old.usdt_amount
      or new.market_rate is distinct from old.market_rate
      or new.client_rate is distinct from old.client_rate
      or new.pricing_mode is distinct from old.pricing_mode
      or new.commission_pct is distinct from old.commission_pct
      or new.commission_rub is distinct from old.commission_rub
      or new.gross_rub is distinct from old.gross_rub
      or new.payable_rub is distinct from old.payable_rub then
      raise exception 'Core transfer fields are locked after payments exist for this transfer.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$function$
                                                                                             |
| public          | next_transfer_reference_number          | reference_timestamp timestamp with time zone | text          | true             | CREATE OR REPLACE FUNCTION public.next_transfer_reference_number(reference_timestamp timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  next_reference_year integer :=
    extract(year from coalesce(reference_timestamp, timezone('utc', now())))::integer;
  next_number integer;
begin
  insert into public.transfer_reference_counters (reference_year, last_number)
  values (next_reference_year, 1)
  on conflict (reference_year)
  do update
    set last_number = public.transfer_reference_counters.last_number + 1,
        updated_at = timezone('utc', now())
  returning last_number into next_number;

  return format('TR-%s-%s', next_reference_year, lpad(next_number::text, 4, '0'));
end;
$function$
                                                                                                                                                                                                                                                                                                                                         |
| public          | refresh_transfer_status                 | p_transfer_id uuid                           | void          | false            | CREATE OR REPLACE FUNCTION public.refresh_transfer_status(p_transfer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_payable numeric(18,2);
  v_paid numeric(18,2);
begin
  select payable_rub
  into v_payable
  from public.transfers
  where id = p_transfer_id;

  select coalesce(sum(amount_rub), 0)::numeric(18,2)
  into v_paid
  from public.transfer_payments
  where transfer_id = p_transfer_id;

  update public.transfers
  set status = case
    when v_paid <= 0 then 'open'
    when v_paid < v_payable then 'partial'
    else 'paid'
  end,
  updated_at = now()
  where id = p_transfer_id;
end;
$function$
                                                                                                                                                                                                                                                                                                                        -- 9. Public functions relevant to the current app and discovered live RPCs
                                                                                                                                                               |
| public          | rls_auto_enable                         |                                              | event_trigger | true             | CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
 |

-- 10. Routine grants


 | routine_schema | routine_name                            | grantee       | privilege_type |
| -------------- | --------------------------------------- | ------------- | -------------- |
| public         | assign_transfer_reference_number        | PUBLIC        | EXECUTE        |
| public         | assign_transfer_reference_number        | anon          | EXECUTE        |
| public         | assign_transfer_reference_number        | authenticated | EXECUTE        |
| public         | assign_transfer_reference_number        | postgres      | EXECUTE        |
| public         | assign_transfer_reference_number        | service_role  | EXECUTE        |
| public         | current_org_id                          | PUBLIC        | EXECUTE        |
| public         | current_org_id                          | anon          | EXECUTE        |
| public         | current_org_id                          | authenticated | EXECUTE        |
| public         | current_org_id                          | postgres      | EXECUTE        |
| public         | current_org_id                          | service_role  | EXECUTE        |
| public         | lock_transfer_core_fields_after_payment | PUBLIC        | EXECUTE        |
| public         | lock_transfer_core_fields_after_payment | anon          | EXECUTE        |
| public         | lock_transfer_core_fields_after_payment | authenticated | EXECUTE        |
| public         | lock_transfer_core_fields_after_payment | postgres      | EXECUTE        |
| public         | lock_transfer_core_fields_after_payment | service_role  | EXECUTE        |
| public         | next_transfer_reference_number          | PUBLIC        | EXECUTE        |
| public         | next_transfer_reference_number          | anon          | EXECUTE        |
| public         | next_transfer_reference_number          | authenticated | EXECUTE        |
| public         | next_transfer_reference_number          | postgres      | EXECUTE        |
| public         | next_transfer_reference_number          | service_role  | EXECUTE        |
| public         | refresh_transfer_status                 | PUBLIC        | EXECUTE        |
| public         | refresh_transfer_status                 | anon          | EXECUTE        |
| public         | refresh_transfer_status                 | authenticated | EXECUTE        |
| public         | refresh_transfer_status                 | postgres      | EXECUTE        |
| public         | refresh_transfer_status                 | service_role  | EXECUTE        |
| public         | rls_auto_enable                         | PUBLIC        | EXECUTE        |
| public         | rls_auto_enable                         | anon          | EXECUTE        |
| public         | rls_auto_enable                         | authenticated | EXECUTE        |
| public         | rls_auto_enable                         | postgres      | EXECUTE        |
| public         | rls_auto_enable                         | service_role  | EXECUTE        |



-- 11. Non-internal triggers


| table_schema | table_name        | trigger_name                             | trigger_def                                                                                                                                               |
| ------------ | ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public       | customers         | trg_audit_customers                      | CREATE TRIGGER trg_audit_customers AFTER INSERT OR DELETE OR UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION audit_row_changes()                        |
| public       | customers         | trg_customers_defaults                   | CREATE TRIGGER trg_customers_defaults BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION set_customer_defaults()                                    |
| public       | customers         | trg_customers_updated_at                 | CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at()                                         |
| public       | transfer_payments | trg_audit_transfer_payments              | CREATE TRIGGER trg_audit_transfer_payments AFTER INSERT OR DELETE OR UPDATE ON transfer_payments FOR EACH ROW EXECUTE FUNCTION audit_row_changes()        |
| public       | transfer_payments | trg_transfer_payments_defaults           | CREATE TRIGGER trg_transfer_payments_defaults BEFORE INSERT ON transfer_payments FOR EACH ROW EXECUTE FUNCTION set_transfer_payment_defaults()            |
| public       | transfer_payments | trg_transfer_payments_refresh_status_del | CREATE TRIGGER trg_transfer_payments_refresh_status_del AFTER DELETE ON transfer_payments FOR EACH ROW EXECUTE FUNCTION after_payment_mutation()          |
| public       | transfer_payments | trg_transfer_payments_refresh_status_ins | CREATE TRIGGER trg_transfer_payments_refresh_status_ins AFTER INSERT ON transfer_payments FOR EACH ROW EXECUTE FUNCTION after_payment_mutation()          |
| public       | transfer_payments | trg_transfer_payments_refresh_status_upd | CREATE TRIGGER trg_transfer_payments_refresh_status_upd AFTER UPDATE ON transfer_payments FOR EACH ROW EXECUTE FUNCTION after_payment_mutation()          |
| public       | transfers         | lock_transfer_core_fields_after_payment  | CREATE TRIGGER lock_transfer_core_fields_after_payment BEFORE UPDATE ON transfers FOR EACH ROW EXECUTE FUNCTION lock_transfer_core_fields_after_payment() |
| public       | transfers         | set_transfer_reference_number            | CREATE TRIGGER set_transfer_reference_number BEFORE INSERT ON transfers FOR EACH ROW EXECUTE FUNCTION assign_transfer_reference_number()                  |
| public       | transfers         | trg_audit_transfers                      | CREATE TRIGGER trg_audit_transfers AFTER INSERT OR DELETE OR UPDATE ON transfers FOR EACH ROW EXECUTE FUNCTION audit_row_changes()                        |
| public       | transfers         | trg_transfers_defaults                   | CREATE TRIGGER trg_transfers_defaults BEFORE INSERT ON transfers FOR EACH ROW EXECUTE FUNCTION set_transfer_defaults()                                    |
| public       | transfers         | trg_transfers_updated_at                 | CREATE TRIGGER trg_transfers_updated_at BEFORE UPDATE ON transfers FOR EACH ROW EXECUTE FUNCTION set_updated_at()                                         |
| public       | user_profiles     | trg_user_profiles_updated_at             | CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()                                 |