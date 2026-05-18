create database foodmenu;
USE foodmenu;
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    price INT,
    category VARCHAR(50),
    type VARCHAR(50)
);
INSERT INTO items (name, price, category, type) VALUES

-- Starters Veg (10)
('Paneer Tikka',140,'starter','veg'),
('Gobi Manchurian',120,'starter','veg'),
('Veg Spring Roll',110,'starter','veg'),
('Chilli Paneer',150,'starter','veg'),
('Baby Corn Fry',130,'starter','veg'),
('Mushroom Chilli',140,'starter','veg'),
('Veg Cutlet',100,'starter','veg'),
('French Fries',90,'starter','veg'),
('Cheese Balls',150,'starter','veg'),
('Hara Bhara Kabab',130,'starter','veg'),

-- Starters Nonveg (8)
('Chicken 65',180,'starter','nonveg'),
('Chicken Tikka',200,'starter','nonveg'),
('Chicken Lollipop',190,'starter','nonveg'),
('Pepper Chicken',210,'starter','nonveg'),
('Fish Fry',220,'starter','nonveg'),
('Chicken Wings',180,'starter','nonveg'),
('Chicken Nuggets',150,'starter','nonveg'),
('Grilled Chicken',230,'starter','nonveg'),

-- Soups + Street (6)
('Tomato Soup',90,'starter','veg'),
('Sweet Corn Soup',100,'starter','veg'),
('Hot & Sour Soup',110,'starter','veg'),
('Pani Puri',60,'starter','veg'),
('Bhel Puri',70,'starter','veg'),
('Samosa',40,'starter','veg'),

-- Main Course Veg (5)
('Paneer Butter Masala',180,'maincourse','veg'),
('Kadai Paneer',190,'maincourse','veg'),
('Veg Kurma',170,'maincourse','veg'),
('Dal Tadka',150,'maincourse','veg'),
('Mix Veg Curry',160,'maincourse','veg'),

-- Chicken (3)
('Butter Chicken',240,'maincourse','nonveg'),
('Chicken Curry',220,'maincourse','nonveg'),
('Chicken Masala',230,'maincourse','nonveg'),

-- Mutton (2)
('Mutton Curry',280,'maincourse','nonveg'),
('Mutton Masala',300,'maincourse','nonveg'),

-- Biryani (3)
('Veg Biryani',180,'maincourse','veg'),
('Chicken Biryani',220,'maincourse','nonveg'),
('Mutton Biryani',260,'maincourse','nonveg'),

-- Breads (4)
('Naan',40,'maincourse','veg'),
('Butter Naan',50,'maincourse','veg'),
('Roti',30,'maincourse','veg'),
('Parotta',35,'maincourse','veg'),

-- South Indian (2)
('Meals',150,'maincourse','veg'),
('Mini Meals',120,'maincourse','veg'),

-- Desserts (5)
('Gulab Jamun',80,'desserts','veg'),
('Rasgulla',90,'desserts','veg'),
('Jalebi',70,'desserts','veg'),
('Vanilla Ice Cream',60,'desserts','veg'),
('Chocolate Ice Cream',70,'desserts','veg'),

-- Beverages (5)
('Tea',20,'beverages','veg'),
('Coffee',30,'beverages','veg'),
('Cold Coffee',80,'beverages','veg'),
('Coke',50,'beverages','veg'),
('Mango Juice',90,'beverages','veg');
SELECT COUNT(*) FROM items;