const Payment = require('../models/payment');

exports.createPayment = async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    res.status(201).send(payment);
  } catch (error) {
    res.status(400).send(error);
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate('jobId laborerId');
    res.status(200).send(payments);
  } catch (error) {
    res.status(500).send(error);
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('jobId laborerId');
    if (!payment) {
      return res.status(404).send();
    }
    res.status(200).send(payment);
  } catch (error) {
    res.status(500).send(error);
  }
};

exports.updatePaymentById = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!payment) {
      return res.status(404).send();
    }
    res.status(200).send(payment);
  } catch (error) {
    res.status(400).send(error);
  }
};

exports.deletePaymentById = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).send();
    }
    res.status(200).send(payment);
  } catch (error) {
    res.status(500).send(error);
  }
};
