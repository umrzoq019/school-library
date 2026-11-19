-- Optional sample books so the shelves are not empty on day one. Run once, after schema.sql.
insert into public.books (title, author, genre, lang, year, total, shelf, description) values
 ('The Little Prince', 'Antoine de Saint-Exupéry', 'Fiction', 'en', '1943', 3, 'A-1', 'A pilot stranded in the desert meets a small prince who has travelled from asteroid to asteroid.'),
 ('Pride and Prejudice', 'Jane Austen', 'Classics', 'en', '1813', 2, 'A-2', 'Elizabeth Bennet and Mr Darcy learn to see past first impressions.'),
 ('A Brief History of Time', 'Stephen Hawking', 'Science', 'en', '1988', 2, 'C-1', 'From the Big Bang to black holes, explained for general readers.'),
 ('The Hobbit', 'J. R. R. Tolkien', 'Fantasy', 'en', '1937', 3, 'A-3', 'Bilbo Baggins joins thirteen dwarves on a journey to reclaim their mountain home.'),
 ('Harry Potter and the Philosopher''s Stone', 'J. K. Rowling', 'Fantasy', 'en', '1997', 4, 'A-4', 'A boy discovers he is a wizard and starts at Hogwarts.'),
 ('Sapiens', 'Yuval Noah Harari', 'History', 'en', '2011', 2, 'D-2', 'A short history of humankind.'),
 ('O''tkan kunlar', 'Abdulla Qodiriy', 'Classics', 'uz', '1925', 4, 'U-1', 'The first Uzbek novel: the love story of Otabek and Kumush.'),
 ('Mehrobdan chayon', 'Abdulla Qodiriy', 'Classics', 'uz', '1929', 2, 'U-2', 'A historical novel set in the Kokand khanate.'),
 ('Sariq devni minib', 'Xudoyberdi To''xtaboyev', 'Fiction', 'uz', '1976', 3, 'U-3', 'A funny adventure story loved by generations of Uzbek readers.'),
 ('Ikki eshik orasi', 'O''tkir Hoshimov', 'Fiction', 'uz', '1986', 2, 'U-4', 'A novel about family, memory and the choices of one life.'),
 ('Преступление и наказание', 'Фёдор Достоевский', 'Classics', 'ru', '1866', 2, 'R-1', 'Роман о студенте Раскольникове и цене преступления.'),
 ('Война и мир', 'Лев Толстой', 'Classics', 'ru', '1869', 2, 'R-2', 'Эпопея о русском обществе эпохи наполеоновских войн.');
