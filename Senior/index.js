const fs = require('fs');
const csv = require('csv-parser');
const express = require('express');

const port = 3000;
const app = express();

// Variaveis
const users = [];
const reviews = [];
const payments = [];
const products = [];
const locations = [];

// Lê os dados
fs.createReadStream('./_DADOS/orders_dataset.csv').pipe(csv()).on('data', (data) => users.push(data));
fs.createReadStream('./_DADOS/products_dataset.csv').pipe(csv()).on('data', (data) => products.push(data));
fs.createReadStream('./_DADOS/customers_dataset.csv').pipe(csv()).on('data', (data) => locations.push(data));
fs.createReadStream('./_DADOS/order_reviews_dataset.csv').pipe(csv()).on('data', (data) => reviews.push(data));
fs.createReadStream('./_DADOS/order_payments_dataset.csv').pipe(csv()).on('data', (data) => payments.push(data));

// 1 - Onde estão
app.post('/where', (req, res) => {
    const locationsCount = {};

    locations.forEach(location => {
        if (!locationsCount[location.customer_state]) {
            locationsCount[location.customer_state] = 0;
        }

        locationsCount[location.customer_state] += 1;
    });

    res.json(Object.entries(locationsCount).sort(([,a],[,b]) => b-a).map(item => ({
        state: item[0],
        amount: item[1]
    })));
});

// 2 - Categorias
app.post('/category', (req, res) => {
    const categoriesCount = {};

    products.forEach(product => {
        if (!categoriesCount[product.product_category_name]) {
            categoriesCount[product.product_category_name] = 0;
        }

        categoriesCount[product.product_category_name] += 1;
    });

    res.json(Object.entries(categoriesCount).sort(([,a],[,b]) => b-a).slice(0, 5).map(item => ({
        name: item[0],
        amount: item[1],
    })));
});

// 3 - Volta a combrar
app.post('/rebuy', (req, res) => {
    const usersCount = {};

    users.forEach(user => {
        if (!usersCount[user.customer_id]) {
            usersCount[user.customer_id] = 0;
        }

        usersCount[user.customer_id] += 1;
    })

    res.json({Voltam: Object.entries(usersCount).sort(([,a],[,b]) => b-a).map(items => ({
        count: items[1]
    })).filter(items => items.count > 1).length > 0 ? "Sim": "Não"});
});
// 5
app.post('/evaluations', (req, res) => {
    const reviewsCount = {};

    reviews.forEach(user => {
        if (!reviewsCount[user.review_score]) {
            reviewsCount[user.review_score] = 0;
        }

        reviewsCount[user.review_score] += 1;
    })

    res.json(Object.entries(reviewsCount).map(item => ({
        eval: item[0],
        count: item[1]
    })));
});

// 6 - Como pagam
app.post('/payment', (req, res) => {
    const paymentsCount = {money: 0};

    payments.forEach(payment => {
        if (!payment.payment_type || payment.payment_type == 'not_defined') {
            paymentsCount.money += 1;
        }

        if (payment.payment_type && !paymentsCount[payment.payment_type]) {
            paymentsCount[payment.payment_type] = 0;
        }

        paymentsCount[payment.payment_type] += 1;
    });

    res.json(Object.entries(paymentsCount).sort(([,a],[,b]) => b-a).slice(0, 5).map(item => ({
        amount: item[1],
        paymentMethod: item[0],
    })));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});