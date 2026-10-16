CREATE DATABASE IF NOT EXISTS tailieu_sv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tailieu_sv;

CREATE TABLE IF NOT EXISTS roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS plans (
  plan_id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(50) NOT NULL UNIQUE,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  duration_days INT NOT NULL DEFAULT 0,
  description VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS faculties (
  faculty_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description VARCHAR(255),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(category_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
  subject_id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  subject_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  CONSTRAINT fk_subjects_faculty FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL DEFAULT 1,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  avatar_url VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tags (
  tag_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documents (
  doc_id INT AUTO_INCREMENT PRIMARY KEY,
  uploader_id INT NOT NULL,
  approved_by INT NULL,
  category_id INT NOT NULL,
  subject_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  file_path VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  thumbnail_url VARCHAR(255) NULL,
  file_type VARCHAR(50) NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'Tài liệu',
  file_size BIGINT NOT NULL DEFAULT 0,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reject_reason VARCHAR(255) NULL,
  view_count INT NOT NULL DEFAULT 0,
  download_count INT NOT NULL DEFAULT 0,
  rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_documents_uploader FOREIGN KEY (uploader_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_documents_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_documents_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_documents_subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_documents_status_created (status, created_at),
  INDEX idx_documents_subject (subject_id),
  INDEX idx_documents_uploader (uploader_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS document_tags (
  doc_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (doc_id, tag_id),
  CONSTRAINT fk_document_tags_doc FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_document_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ratings (
  rating_id INT AUTO_INCREMENT PRIMARY KEY,
  doc_id INT NOT NULL,
  user_id INT NOT NULL,
  score TINYINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rating_user_doc (doc_id, user_id),
  CONSTRAINT chk_rating_score CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT fk_ratings_doc FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS downloads (
  download_id INT AUTO_INCREMENT PRIMARY KEY,
  doc_id INT NOT NULL,
  user_id INT NULL,
  downloaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  CONSTRAINT fk_downloads_doc FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_downloads_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_downloads_doc (doc_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favorites (
  user_id INT NOT NULL,
  doc_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, doc_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favorites_doc FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  comment_id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NULL,
  doc_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(comment_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_comments_doc FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_comments_doc (doc_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  doc_id INT NOT NULL,
  user_id INT NOT NULL,
  handled_by INT NULL,
  reason VARCHAR(255) NOT NULL,
  detail TEXT,
  status ENUM('open','resolved') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  CONSTRAINT fk_reports_doc FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reports_handler FOREIGN KEY (handled_by) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_reports_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_notifications_user (user_id, is_read, created_at)
) ENGINE=InnoDB;

INSERT IGNORE INTO roles(role_id, role_name, description) VALUES
(1,'student','Sinh viên'),(2,'moderator','Người duyệt nội dung'),(3,'admin','Quản trị viên');
INSERT IGNORE INTO plans
(plan_id, plan_name, price, duration_days, description)
VALUES
(1, 'Free', 0, 0, 'Gói miễn phí'),
(2, 'Pro', 49000, 30, 'Gói Pro dành cho sinh viên'),
(3, 'VIP', 99000, 30, 'Gói VIP với đầy đủ quyền lợi');

INSERT IGNORE INTO faculties(faculty_id,name,slug) VALUES
(1,'Công nghệ thông tin','cong-nghe-thong-tin'),
(2,'Kinh tế','kinh-te'),
(3,'Điện - Điện tử','dien-dien-tu'),
(4,'Ngoại ngữ','ngoai-ngu');

INSERT IGNORE INTO categories(category_id,parent_id,name,slug,description) VALUES
(1,NULL,'Giáo trình','giao-trinh','Tài liệu giáo trình'),
(2,NULL,'Bài giảng','bai-giang','Slide và bài giảng'),
(3,NULL,'Đề thi','de-thi','Đề kiểm tra, đề thi'),
(4,NULL,'Ghi chú','ghi-chu','Ghi chú học tập');

INSERT IGNORE INTO subjects(subject_id,faculty_id,subject_code,name,slug) VALUES
(1,1,'IT001','Lập trình','lap-trinh'),
(2,1,'IT002','Cơ sở dữ liệu','co-so-du-lieu'),
(3,1,'IT003','Mạng máy tính','mang-may-tinh'),
(4,1,'IT004','Toán','toan'),
(5,2,'KT001','Kinh tế','kinh-te'),
(6,4,'NN001','Ngoại ngữ','ngoai-ngu');

INSERT IGNORE INTO tags(name,slug) VALUES
('Lập trình','lap-trinh'),('SQL','sql'),('Python','python'),('C++','c-plus-plus'),('OOP','oop'),('Mạng máy tính','mang-may-tinh'),('ERD','erd');
SELECT*from plans;