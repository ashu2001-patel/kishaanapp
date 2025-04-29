const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentControllers');

router.post('/', paymentController.createPayment);
router.get('/', paymentController.getPayments);
router.get('/:id', paymentController.getPaymentById);
router.put('/:id', paymentController.updatePaymentById);
router.delete('/:id', paymentController.deletePaymentById);

module.exports = router;
