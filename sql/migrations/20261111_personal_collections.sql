CREATE TABLE IF NOT EXISTS collections (
  collection_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_collections_user_name (user_id,name),
  CONSTRAINT fk_collections_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS collection_documents (
  collection_id INT NOT NULL,
  doc_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (collection_id,doc_id),
  INDEX idx_collection_documents_doc (doc_id),
  CONSTRAINT fk_collection_documents_collection FOREIGN KEY (collection_id) REFERENCES collections(collection_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_collection_documents_doc FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
