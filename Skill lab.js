const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');

const app = express();
app.use(bodyParser.json());

const PORT = 3000;

// In-memory storage
const menu = [];
const orders = [];
let orderQueue = []; // Queue to track order status updates

const CATEGORIES = ['Starter', 'Main Course', 'Dessert', 'Beverage'];

const validateMenuItem = (item) => {
    return (
        item.name &&
        typeof item.name === 'string' &&
        item.price &&
        typeof item.price === 'number' &&
        item.price > 0 &&
        item.category &&
        CATEGORIES.includes(item.category)
    );
};

const validateOrder = (itemIds) => {
    return itemIds.every((id) => menu.find((menuItem) => menuItem.id === id));
};

app.post('/menu', (req, res) => {
    const { name, price, category } = req.body;

    if (!validateMenuItem(req.body)) {
        return res.status(400).json({ error: 'Invalid menu item data' });
    }

    const newItem = { id: Date.now(), name, price, category };
    menu.push(newItem);

    res.status(201).json(newItem);
});

app.get('/menu', (req, res) => {
    res.json(menu);
});

app.post('/orders', (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || !validateOrder(items)) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    const newOrder = {
        id: Date.now(),
        items: items.map((id) => menu.find((menuItem) => menuItem.id === id)),
        status: 'Preparing',
    };

    orders.push(newOrder);
    orderQueue.push(newOrder.id);

    res.status(201).json(newOrder);
});

app.get('/orders/:id', (req, res) => {
    const orderId = parseInt(req.params.id);
    const order = orders.find((o) => o.id === orderId);

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
});

cron.schedule('*/1 * * * *', () => {
    if (orderQueue.length > 0) {
        const orderId = orderQueue.shift();
        const order = orders.find((o) => o.id === orderId);

        if (order) {
            switch (order.status) {
                case 'Preparing':
                    order.status = 'Out for Delivery';
                    orderQueue.push(orderId);
                    break;
                case 'Out for Delivery':
                    order.status = 'Delivered';
                    break;
            }
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
