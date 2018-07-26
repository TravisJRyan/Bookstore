# Bookstore
A full-stack online bookstore built for my CS351 (Database Management Systems) course that I have been expanding as a personal project.

Technologies I Used: Node.js, Express, MySql, Pug, Bootstrap 3, HTML5/CSS3/JS

To my knowledge, the website is up-to-date here. The hosting service recompiles lazily on each visit, so it may take a few moments to initialize: https://cs351bookstore-ckqtghjksz.now.sh/
(User accounts can be registered, but manager accounts can only be made through the database.)

The store supports the following operations:
Customer: Registering, logging in/sessions, browsing books (searching by attributes), purchasing books, checking orders
Manager: Logging in/sessions, searching for books, modifying book attributes, deleting books, inserting books, placing store orders, checking low stock books, checking store orders

Database credentials have been removed for security. If you wish to use your own MySql database and run this project locally, simply fill out your credentials in the connection object in index.js (the schema and ER Diagram for my database is included), use "npm install" to get node modules, and run with "node index.js".

Feel free to email me at tryan1996@gmail.com for any questions or concerns about this project.

Screenshot of "Search" Page:
![Screenshot](https://github.com/TravisJRyan/Bookstore/blob/master/screenshot.png)
