-- Run once on the server DB (purat)

ALTER TABLE ci_admin
  ADD COLUMN last_login_device VARCHAR(20) NULL AFTER last_ip;

CREATE TABLE IF NOT EXISTS ci_admin_logs (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(100) NOT NULL,
  ip_address   VARCHAR(45)  NULL,
  device_type  VARCHAR(20)  NULL,   -- desktop | mobile | tablet
  browser      VARCHAR(100) NULL,
  os           VARCHAR(100) NULL,
  user_agent   TEXT         NULL,
  app_version  VARCHAR(20)  NULL,   -- from X-App-Version request header
  api_version  VARCHAR(10)  NULL DEFAULT 'v1',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username   (username),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
