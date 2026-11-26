CREATE DATABASE IF NOT EXISTS mr_hungry CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mr_hungry;

-- Guests have no row here. Only registered users, cashiers and admins do.
CREATE TABLE
    users (
        user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(100) NOT NULL, -- bcrypt hash, never the real password
        role ENUM ('user', 'cashier', 'admin') NOT NULL DEFAULT 'user',
        points INT UNSIGNED NOT NULL DEFAULT 0,
        is_active TINYINT (1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

CREATE TABLE
    categories (
        category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(60) NOT NULL UNIQUE,
        sort_order INT NOT NULL DEFAULT 0
    );

CREATE TABLE
    menu_items (
        item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        category_id INT UNSIGNED NOT NULL,
        name VARCHAR(120) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        is_best_seller TINYINT (1) NOT NULL DEFAULT 0,
        is_available TINYINT (1) NOT NULL DEFAULT 1, -- 0 = hidden from the public menu
        has_image TINYINT (1) NOT NULL DEFAULT 0,
        image_version INT UNSIGNED NOT NULL DEFAULT 0, -- changes whenever the photo changes (cache busting)
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE RESTRICT,
        INDEX idx_menu_category (category_id)
    );

-- Photos live in their own table so loading the menu never drags image data along.
-- Deleting a menu item deletes its photo automatically.
CREATE TABLE
    menu_item_images (
        item_id INT UNSIGNED PRIMARY KEY,
        mime_type VARCHAR(50) NOT NULL,
        data MEDIUMBLOB NOT NULL,
        FOREIGN KEY (item_id) REFERENCES menu_items (item_id) ON DELETE CASCADE
    );

-- Vouchers the admin offers (users spend points to claim them)
CREATE TABLE
    vouchers (
        voucher_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        points_cost INT UNSIGNED NOT NULL,
        discount_type ENUM ('amount', 'percent') NOT NULL DEFAULT 'amount',
        discount_value DECIMAL(10, 2) NOT NULL,
        is_active TINYINT (1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- Vouchers a user has claimed. Details are copied so editing/deleting the
-- original voucher never breaks one the customer already owns.
CREATE TABLE
    user_vouchers (
        user_voucher_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        voucher_id INT UNSIGNED NULL,
        title VARCHAR(100) NOT NULL,
        discount_type ENUM ('amount', 'percent') NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        status ENUM ('Available', 'Reserved', 'Used') NOT NULL DEFAULT 'Available',
        claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (voucher_id) REFERENCES vouchers (voucher_id) ON DELETE SET NULL,
        INDEX idx_uv_user (user_id, status)
    );

CREATE TABLE
    orders (
        order_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_number CHAR(6) NOT NULL UNIQUE, -- what people read out loud
        qr_token CHAR(32) NOT NULL UNIQUE, -- the secret inside the QR code
        user_id INT UNSIGNED NULL, -- NULL = guest
        customer_name VARCHAR(100) NULL, -- name at order time (kept if the account is deleted)
        status ENUM ('Pending', 'Completed', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Pending',
        subtotal DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total DECIMAL(10, 2) NOT NULL,
        points_earned INT UNSIGNED NOT NULL DEFAULT 0,
        user_voucher_id INT UNSIGNED NULL,
        qr_expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        handled_by INT UNSIGNED NULL, -- the cashier who completed/rejected it
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL,
        FOREIGN KEY (handled_by) REFERENCES users (user_id) ON DELETE SET NULL,
        FOREIGN KEY (user_voucher_id) REFERENCES user_vouchers (user_voucher_id) ON DELETE SET NULL,
        INDEX idx_orders_status_exp (status, qr_expires_at),
        INDEX idx_orders_user (user_id, created_at),
        INDEX idx_orders_created (created_at)
    );

-- Name and price are copied at order time, so later menu edits or deletions
-- never change what an old order says.
CREATE TABLE
    order_items (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id INT UNSIGNED NOT NULL,
        item_id INT UNSIGNED NULL,
        name VARCHAR(120) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        qty INT UNSIGNED NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES menu_items (item_id) ON DELETE SET NULL,
        INDEX idx_oi_order (order_id)
    );

-- Starter data (delete or change freely from the admin dashboard)
INSERT INTO
    categories (name, sort_order)
VALUES
    ('Pasta', 1),
    ('Chicken Wings', 2),
    ('Rice Meals', 3),
    ('Snacks', 4),
    ('Quesadilla', 5),
    ('Combo Meals', 6),
    ('Salad', 7),
    ('Student Meals', 8),
    ('Add-Ons', 9);

INSERT INTO
    vouchers (title, points_cost, discount_type, discount_value)
VALUES
    ('P20 off your order', 50, 'amount', 20),
    ('10% off your order', 120, 'percent', 10);