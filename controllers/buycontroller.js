const BuyAnimal = require('../models/animalbuys');
const Animal = require('../models/Animal');

// Create a new animal purchase
exports.createPurchase = async (req, res) => {
  const { animalId, buyerName, buyerContact, buyerLocation } = req.body;

  try {
    // Check if the animal exists
    const animal = await Animal.findById(animalId);
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found' });
    }

    // Create new purchase record
    const purchase = new BuyAnimal({
      animalId,
      buyerName,
      buyerContact,
      buyerLocation,
    });

    await purchase.save();
    res.status(201).json({ message: 'Animal purchase initiated', purchase });
  } catch (error) {
    res.status(500).json({ message: 'Error creating purchase', error: error.message });
  }
};

// Get all purchases for a buyer
exports.getPurchasesByBuyer = async (req, res) => {
  const { buyerName } = req.params;

  try {
    const purchases = await BuyAnimal.find({ buyerName });
    res.status(200).json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchases', error: error.message });
  }
};

// Get purchase by ID
exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await BuyAnimal.findById(req.params.id).populate('animalId');
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.status(200).json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase', error: error.message });
  }
};

// Update the status of a purchase (e.g., mark as completed)
exports.updatePurchaseStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const purchase = await BuyAnimal.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    purchase.status = status;
    await purchase.save();
    res.status(200).json({ message: 'Purchase status updated', purchase });
  } catch (error) {
    res.status(500).json({ message: 'Error updating purchase status', error: error.message });
  }
};
