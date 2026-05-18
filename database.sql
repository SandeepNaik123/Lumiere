CREATE DATABASE food_menu;
USE food_menu;

CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    price INT,
    category VARCHAR(50),
    type VARCHAR(50)
);

INSERT INTO items (name, price, category, type) VALUES

-- ================= STARTERS (Veg + Nonveg + Soups + Street) =================
('Paneer Tikka',140,'starter','veg starters'),
('Gobi Manchurian',120,'starter','veg starters'),
('Veg Spring Roll',110,'starter','veg starters'),
('Chilli Paneer',150,'starter','veg starters'),
('Baby Corn Fry',130,'starter','veg starters'),
('Mushroom Chilli',140,'starter','veg starters'),
('Veg Cutlet',100,'starter','veg starters'),
('French Fries',90,'starter','veg starters'),
('Cheese Balls',150,'starter','veg starters'),
('Hara Bhara Kabab',130,'starter','veg starters'),

('Chicken 65',180,'starter','nonveg starters'),
('Chicken Tikka',200,'starter','nonveg starters'),
('Chicken Lollipop',190,'starter','nonveg starters'),
('Pepper Chicken',210,'starter','nonveg starters'),
('Fish Fry',220,'starter','nonveg starters'),
('Chicken Wings',180,'starter','nonveg starters'),
('Chicken Nuggets',150,'starter','nonveg starters'),
('Grilled Chicken',230,'starter','nonveg starters'),

('Tomato Soup',90,'starter','soups'),
('Sweet Corn Soup',100,'starter','soups'),
('Hot & Sour Soup',110,'starter','soups'),

('Pani Puri',60,'starter','street food'),
('Bhel Puri',70,'starter','street food'),
('Samosa',40,'starter','street food'),

-- ================= MAIN COURSE =================
('Paneer Butter Masala',180,'maincourse','veg main'),
('Kadai Paneer',190,'maincourse','veg main'),
('Veg Kurma',170,'maincourse','veg main'),
('Dal Tadka',150,'maincourse','veg main'),
('Mix Veg Curry',160,'maincourse','veg main'),

('Butter Chicken',240,'maincourse','chicken'),
('Chicken Curry',220,'maincourse','chicken'),
('Chicken Masala',230,'maincourse','chicken'),

('Mutton Curry',280,'maincourse','mutton'),
('Mutton Masala',300,'maincourse','mutton'),

('Veg Biryani',180,'maincourse','biryani'),
('Chicken Biryani',220,'maincourse','biryani'),
('Mutton Biryani',260,'maincourse','biryani'),

('Naan',40,'maincourse','breads'),
('Butter Naan',50,'maincourse','breads'),
('Roti',30,'maincourse','breads'),
('Parotta',35,'maincourse','breads'),

('Meals',150,'maincourse','south indian'),
('Mini Meals',120,'maincourse','south indian'),

-- ================= DESSERTS =================
('Gulab Jamun',80,'desserts','indian sweets'),
('Rasgulla',90,'desserts','indian sweets'),
('Jalebi',70,'desserts','indian sweets'),

('Vanilla Ice Cream',60,'desserts','ice cream'),
('Chocolate Ice Cream',70,'desserts','ice cream'),
('Strawberry Ice Cream',70,'desserts','ice cream'),

('Chocolate Cake',120,'desserts','cakes'),
('Black Forest Cake',140,'desserts','cakes'),

-- ================= BEVERAGES =================
('Tea',20,'beverages','hot'),
('Coffee',30,'beverages','hot'),

('Cold Coffee',80,'beverages','cold'),
('Coke',50,'beverages','cold'),
('Pepsi',50,'beverages','cold'),

('Mango Juice',90,'beverages','juice'),
('Orange Juice',80,'beverages','juice'),

('Chocolate Milkshake',100,'beverages','milkshake'),
('Banana Milkshake',90,'beverages','milkshake'),

('Virgin Mojito',120,'beverages','mocktail'),
('Blue Lagoon',130,'beverages','mocktail');

SELECT * FROM items;