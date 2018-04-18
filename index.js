// Set constants (These are all Node modules.)
const express = require('express'); // Express Server
const mysql = require('mysql'); // Allows connection to MySql
const path = require('path'); // For manipulating paths
const bodyParser = require('body-parser'); // For parsing response bodies from POST operations
const session = require('express-session'); // Manages session variables
var crypto = require('crypto'); // for hashing passwords

// Connection Object for MySQL
const db = mysql.createConnection({
    host: "XXXXXXXX",
    user: "XXXXXXXX",
    password: "XXXXXXXXXX",
    database: "XXXXXXXXXX"
});

// Connect to DB using Connection Object
db.connect((err) => {
    if (err) {
        throw err;
    } else
        console.log('MySql Connected...'); // Successful connection console message
});

// Create Express object for server
const app = express();

// Solves path issues when pushing HTML pages
app.use(express.static(__dirname));

// Use Pug to render our HTML pages
app.set('view engine', 'pug');

// Body Parser for JSON-Encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// Stores sessions
app.use(
    session({
        secret: "jd96x6c7v8bjasdjhkj8nfd4x3zkasd",
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: false
        }
    })
);

// Home Page for choosing Manager or Customer (If logged in, direct to a different page)
app.get('/', function (req, res) {
    if (req.session.managerusername) {
        res.redirect('/checkstock')
    } else if (req.session.customerusername) {
        res.render('customerportal', {
            firstName: req.session.customerfirstname,
            lastName: req.session.customerlastname
        });
    } else {
        res.sendFile(path.join(__dirname + '/static/frontpage.html'));
    }
});

//Log out operation for both customers and managers
app.get('/logout', function (req, res) {
    req.session.destroy(); // destroy all session variables
    res.sendFile(path.join(__dirname + '/static/frontpage.html'));
});

// Customer Sign In
app.get('/customersignin', function (req, res) {
    res.sendFile(path.join(__dirname + '/static/customersignin.html'));
});

// Customer Register
app.get('/customerregister', function (req, res) {
    res.sendFile(path.join(__dirname + '/static/customerregister.html'));
});

// Manager Sign In Page
app.get('/managersignin', function (req, res) {
    res.sendFile(path.join(__dirname + '/static/managersignin.html'));
});

app.get('/customerloginfailure', function (req, res) {
    res.sendFile(path.join(__dirname + '/static/customersigninerror.html'));
});

// Manager Sign In Error Page
app.get('/managersigninerror', function (req, res) {
    res.sendFile(path.join(__dirname + '/static/managersigninerror.html'));
});

// Login Operation for Manager (POST, so there's no web page)
app.post("/managerlogin", function (req, res) {
    var username = req.body.username;
    var password = crypto.createHash('md5').update(req.body.password).digest('hex'); // hash password
    let sql = "SELECT * FROM Manager WHERE UserName = '" + username + "' AND UserPassword = '" + password + "';"
    let query = db.query(sql, (err, results) => {
        if (err || Object.keys(results).length === 0)
            res.redirect("/managersigninerror");
        else {
            req.session.managerusername = results[0]["Username"];
            req.session.managerfirstname = results[0]["FirstName"];
            req.session.managerlastname = results[0]["LastName"];
            req.session.save(); //save session variables

            //Then render the check stock page once logged in
            res.redirect("/checkstock");
        }
    });
});

// Login action for customers (POST, so there's no web page)
app.post("/customerlogin", function (req, res) {
    var username = req.body.username;
    var password = crypto.createHash('md5').update(req.body.password).digest('hex'); // hash password
    let sql = "SELECT * FROM Customer WHERE UserName = '" + username + "' AND UserPassword = '" + password + "';"
    let query = db.query(sql, (err, results) => {
        if (err || Object.keys(results).length === 0)
            res.redirect("/customerloginfailure");
        else {
            req.session.customerusername = results[0]["Username"];
            req.session.customerfirstname = results[0]["FirstName"];
            req.session.customerlastname = results[0]["LastName"];
            req.session.customeremail = results[0]["Email"];
            req.session.save(); // save session variables
            res.redirect("/");
        }
    });
});

// Register action for customers, then logs in and redirects to home page 
app.post("/registercustomer", function (req, res) {
    var username = req.body.username;
    var password = crypto.createHash('md5').update(req.body.password).digest('hex'); // hash password
    var last = req.body.last;
    var first = req.body.first;
    var email = req.body.email;
    var phone = req.body.phone;
    let sql = "INSERT INTO Customer VALUES('" + username + "', '" + password + "', '" + last + "', '" + first + "', '" + email + "', '" + phone +"');"
    let query = db.query(sql, (err, results) => {
        if (err) {
            res.send("Error registering");
        }
        else {
            req.session.customerusername = username;
            req.session.customerfirstname = first;
            req.session.customerlastname = last;
            req.session.customeremail = email;
            req.session.save(); // save session variables
            res.redirect("/");
        }
    });
});

// Customer Page: Displays all books from database and also allows searching for books
app.get('/allbooks', function (req, res) {
    if (!req.session.customerusername) {
        res.sendFile(path.join(__dirname + '/static/customersignin.html'));
    } else {
        let sql = 'SELECT * FROM Book ORDER BY Title LIMIT 10';
        let query = db.query(sql, (err, results) => {
            if (err)
                res.redirect("/customererror");
            else{
                res.render('allbooks', {
                    data: JSON.stringify(results)
                });
            }
        });
    }
});

// Customer Page for an individual book
app.get('/bookpage:isbn', function (req, res) {
    if (!req.session.customerusername)
        res.sendFile(path.join(__dirname + '/static/customersignin.html'));
    else {
        currentIsbn = req.params.isbn.slice(1);
        let sql = 'SELECT * FROM Book WHERE ISBN = "' + currentIsbn + '"';
        let query = db.query(sql, (err, results) => {
            if (err || results[0] == undefined)
                res.redirect("/customererror");
            else {
                res.render('bookpage', {
                    bookdata: results[0]
                });
            }
        });
    }
});

// Customer Page for checking all their orders.
app.get('/checkorders:newinsert', function (req, res) {
    if (!req.session.customerusername)
        res.sendFile(path.join(__dirname + '/static/customersignin.html'));
    else {
        currentUsername = req.session.customerusername;
        let sql = 'SELECT * FROM Customer_Book_Order WHERE username = "' + currentUsername + '" ORDER BY Order_Date DESC;';
        let query = db.query(sql, (err, results) => {
            if (err)
                res.redirect("/customererror");
            else{
                res.render('checkorders', {
                    data: JSON.stringify(results), newinsert: req.params.newinsert.slice(1)
                });
            }
        });
    }
});

// Customer search results page
app.get('/search:searchterm', function (req, res) {
    if (!req.session.customerusername)
        res.sendFile(path.join(__dirname + '/static/customersignin.html'));
    else {
        currentSearchTerm = req.params.searchterm.slice(1);
        let sql = 'SELECT * FROM Book ' +
            'WHERE AUTHOR LIKE "%' + currentSearchTerm + '%" OR ' +
            'TITLE LIKE "%' + currentSearchTerm + '%" OR ' +
            'ISBN LIKE "%' + currentSearchTerm + '%" OR ' +
            'GENRE LIKE "%' + currentSearchTerm + '%"';
        let query = db.query(sql, (err, results) => {
            if (err)
                res.redirect("/customererror");
            else{
                res.render('search', {
                    data: JSON.stringify(results)
                });
            }
        });
    }
});

// Customer page for an individual book
app.get('/buybook:isbn', function (req, res) {
    if (!req.session.customerusername)
        res.sendFile(path.join(__dirname + '/static/customersignin.html'));
    currentIsbn = req.params.isbn.slice(1);
    let sql = 'SELECT * FROM Book WHERE ISBN = "' + currentIsbn + '"';
    let query = db.query(sql, (err, results) => {
        if (err || results[0] == undefined)
            res.redirect("/customererror");
        else {
            res.render('buybook', {
                bookdata: results[0]
            });
        }
    });
});

// Confirmation screen for customer buying a book
app.get('/confirmbuybook:isbn&:name&:address1&:address2&:cardNumber&:shippingChoice', function (req, res) {
    if (!req.session.customerusername)
        res.sendFile(path.join(__dirname + '/static/customersignin.html'));
    else{
        var currentIsbn = req.params.isbn.slice(1);
        let sql = 'SELECT * FROM Book WHERE ISBN = "' + currentIsbn + '"';
        let query = db.query(sql, (err, results) => {
            if (err || results[0] == undefined) {
                res.redirect("/customererror");
            } else {
                bookprice = results[0]["Price"];
                title = results[0]["Title"];
                image = results[0]["Image_Address"];
                author = results[0]["Author"];
                cardNumber = req.params.cardNumber
                res.render("confirmbuybook", {
                    name:req.params.name, isbn: currentIsbn, price: bookprice, cardNumber: cardNumber, // only send last 4 digits of credit card
                    shipping:req.params.shippingChoice, address1: req.params.address1, address2: req.params.address2, author: author
                });
            }
        });
    }
});

// Customer Action: When a book purchase has been confirmed
app.get('/finishbuybook:isbn&:name&:address1&:address2', function (req, res) {
    if (!req.session.customerusername)
        res.sendFile(path.join(__dirname + '/static/customersignin.html'));
    else{
        var dateToday = new Date();
        var orderID = Math.floor(Math.random() * 999999) + 100000; //generate random orderId from 100000 to 999999
        currentIsbn = req.params.isbn.slice(1);
        let sql = 'SELECT Price FROM Book WHERE ISBN = "' + currentIsbn + '"';
        let query = db.query(sql, (err, results) => {
            if (err || results[0] == "undefined")
                res.redirect("/managererror");
            else {
                bookprice = results[0]["Price"];
                let newSql = 'INSERT INTO Customer_Book_Order VALUES ("' + req.session.customerusername + '", "' + // Query for inserting a book
                currentIsbn + '", ' +
                '"1"' + ', "' +
                dateToday + '", "Processing", '+
                orderID+ ');';
                let query = db.query(newSql, (err, results) => {
                    if (err)
                        res.send("Something went wrong!");
                    else {
                        res.redirect('/checkorders:true');
                    }
                });
            }
        });
    }
});

// Manager Portal/Dashboard for All Operations
app.get('/managerportal', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else
        res.sendFile(path.join(__dirname + '/static/managerportal.html'));
});

// Manager page when the store wants to place a book order
app.get('/storebookorder:isbn', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        currentIsbn = req.params.isbn.slice(1);
        let sql = 'SELECT * FROM Book WHERE ISBN = "' + currentIsbn + '"';
        let query = db.query(sql, (err, results) => {
            if (err || results[0] == undefined)
                res.redirect("/managererror");
            else {
                res.render('storebookorder', {
                    bookdata: results[0],
                    firstName: req.session.managerfirstname,
                    lastName: req.session.managerlastname
                });
            }
        });
    }
});

// Manager page when the store wants to place a book order
app.get('/storeorderfinished:isbn&:numcopies&:managername', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        currentIsbn = req.params.isbn.slice(1);
        let sql = 'SELECT * FROM Book WHERE ISBN = "' + currentIsbn + '"'; // query to get all book info for an ISBN
        let query = db.query(sql, (err, results) => {
            if (err || results[0 == undefined])
                res.redirect("/managererror");
            else {
                var orderId = Math.floor(Math.random() * 999999) + 100000 //generate random orderId from 100000 to 999999
                let processOrderSql = "INSERT INTO Store_Book_Order " +
                    "VALUES('" + req.params.managername + "', '" + currentIsbn + "', " + req.params.numcopies + ", " + orderId + ");";
                let query = db.query(processOrderSql, (err) => {
                    if (err) {
                        res.redirect("/managererror");
                    } else{
                        res.render('storeorderfinished', {
                            bookdata: results[0],
                            numCopies: req.params.numcopies,
                            managerName: req.params.managername,
                            orderId
                        });
                    }
                })
            }
        });
    }
});

// When a book has been inserted
app.get('/finishinsert:isbn&:author&:title&:genre&:copies&:image&:price', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        let sql = 'INSERT INTO Book VALUES (' + req.params.price + ', "' + // Query for inserting a book
            req.params.title + '", "' +
            req.params.author + '", ' +
            req.params.copies + ', "' +
            req.params.genre + '", "' +
            req.params.image + '", "' +
            req.params.isbn.slice(1) + '");';
        let query = db.query(sql, (err, results) => {
            if (err)
                res.redirect("/managererror");
            else {
                res.render('finishinsert', { // Render Pug page if query successful
                    isbn: req.params.isbn.slice(1),
                    author: req.params.author,
                    title: req.params.title,
                    genre: req.params.genre,
                    copies: req.params.copies,
                    image: req.params.image,
                    price: req.params.price
                });
            }
        });
    }
});

// Manager page to insert a new book into the database
app.get('/insertbook', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else
        res.render("insertbook");
});

// Manager page to search for a book to delete
app.get('/deletepage', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else
        res.render("deletepage");
});

// Manager page to confirm deleting a single book
app.get('/confirmdelete:isbn', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        currentIsbn = req.params.isbn.slice(1);
        let sql = 'SELECT * FROM Book WHERE ISBN = "' + currentIsbn + '"';
        let query = db.query(sql, (err, results) => {
            if (err)
                res.redirect("/managererror");
            else {
                res.render('confirmdelete', {
                    bookIsbn: currentIsbn
                });
            }
        });
    }
});

// Manager page to check stock of low-inventory books
app.get('/checkstock', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        let sql = 'SELECT * FROM Book WHERE Number_In_Stock < 5';
        let query = db.query(sql, (err, results) => {
            if (err)
                res.redirect("/managererror");
            else{
                res.render('checkstock', {
                    data: JSON.stringify(results),
                    justLoggedIn: false,
                    firstName: req.session.managerfirstname,
                    lastName: req.session.managerlastname
                });
            }
        });
    }
});

// Manager page to check orders for the book store
app.get('/checkstoreorders', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        let sql = 'SELECT * FROM Store_Book_Order';
        let query = db.query(sql, (err, results) => {
            if (err)
                res.redirect("/managererror");
            else{
                res.render('checkstoreorders', {
                    data: JSON.stringify(results)
                });
            }
        });
    }
});

// Manager page to confirm deleting a single book
app.get('/deletebook:isbn', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        currentIsbn = req.params.isbn.slice(1);
        let sql = 'SELECT * FROM Book WHERE ISBN = "' + currentIsbn + '"';
        let query = db.query(sql, (err, results) => {
            if (err)
                res.redirect("/managererror");
            else {
                res.render('deletebook', {
                    bookTitle: results[0]["Title"],
                    bookIsbn: results[0]["ISBN"],
                    bookGenre: results[0]["Genre"],
                    bookCopies: results[0]["Number_In_Stock"],
                    bookPrice: results[0]["Price"].toFixed(2),
                    bookImage: results[0]["Image_Address"],
                    bookAuthor: results[0]["Author"]
                });
            }
        });
    }
});

// Manager search results page for DELETING a book
app.get('/deletesearch:searchterm', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        currentSearchTerm = req.params.searchterm.slice(1);
        let sql = 'SELECT * FROM Book ' +
            'WHERE AUTHOR LIKE "%' + currentSearchTerm + '%" OR ' +
            'TITLE LIKE "%' + currentSearchTerm + '%" OR ' +
            'ISBN LIKE "%' + currentSearchTerm + '%" OR ' +
            'GENRE LIKE "%' + currentSearchTerm + '%"';
        let query = db.query(sql, (err, results) => {
            if (err)
                res.redirect("/managererror");
            else {
                res.render('deletesearch', {
                    data: JSON.stringify(results)
                });
            }
        });
    }
});

// Manager page to search for a book to MODIFY
app.get('/modifypage', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else
        res.render("modifypage");
});

// Manager search results page for MODIFYING a book
app.get('/modifysearch:searchterm', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        currentSearchTerm = req.params.searchterm.slice(1);
        let sql = 'SELECT * FROM Book ' +
            'WHERE AUTHOR LIKE "%' + currentSearchTerm + '%" OR ' +
            'TITLE LIKE "%' + currentSearchTerm + '%" OR ' +
            'ISBN LIKE "%' + currentSearchTerm + '%" OR ' +
            'GENRE LIKE "%' + currentSearchTerm + '%"';
        let query = db.query(sql, (err, results) => {
            if (err){
                res.redirect("/managererror");
            } else{
                res.render('modifysearch', {
                    data: JSON.stringify(results)
                });
            }
        });
    }
});

// Manager page to enter details for modifying a single book
app.get('/modifybook:isbn', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        currentIsbn = req.params.isbn.slice(1);
        let sql = 'SELECT * FROM Book WHERE ISBN = "' + currentIsbn + '"';
        let query = db.query(sql, (err, results) => {
            if (err || results[0] == undefined){
                res.redirect("managererror");
            }
            else {
                res.render('modifybook', {
                    bookTitle: results[0]["Title"],
                    bookIsbn: results[0]["ISBN"],
                    bookGenre: results[0]["Genre"],
                    bookCopies: results[0]["Number_In_Stock"],
                    bookPrice: results[0]["Price"],
                    bookImage: results[0]["Image_Address"],
                    bookAuthor: results[0]["Author"]
                });
            }
        });
    }
});

// When a book has been inserted
app.get('/finishmodify:isbn&:author&:title&:genre&:copies&:image&:price', function (req, res) {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else {
        let sql = 'UPDATE Book SET ' +
            "Price = " + req.params.price + ", " +
            'Title = "' + req.params.title + '", ' +
            'Author = "' + req.params.author + '", ' +
            "Number_In_Stock = " + req.params.copies + ", " +
            "Genre = '" + req.params.genre + "', " +
            "Image_Address = '" + req.params.image + "' WHERE ISBN = '" + req.params.isbn.slice(1) + "';";
        let query = db.query(sql, (err, results) => {
            if (err) {
                res.render("managererror");
            } else {
                res.render('modifysuccess', {
                    isbn: req.params.isbn.slice(1),
                    author: req.params.author,
                    title: req.params.title,
                    genre: req.params.genre,
                    copies: req.params.copies,
                    image: req.params.image,
                    price: req.params.price
                });
            }
        });
    }
});

// Error Page for Managers
app.get('/managererror', (req, res) => {
    if (!req.session.managerusername)
        res.sendFile(path.join(__dirname + '/static/managersignin.html'));
    else
        res.render("managererror");
});

// Error Page for Customers
app.get('/customererror', (req, res) => {
    if (!req.session.customerusername)
        res.sendFile(path.join(__dirname + '/static/customersignin.html'));
    else
        res.render("customererror");
});

// Direct to home page for any other routing or for errors
app.get('/*', (req, res) => {
    res.redirect("/");
});

// Start server listening
app.listen('3000', () => {
    console.log('Server started on port 3000');
});