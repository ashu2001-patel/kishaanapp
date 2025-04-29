const Application = require('../models/application');

exports.createApplication = async (req, res) => {
  try {
    const application = new Application(req.body);
    await application.save();
    res.status(201).send(application);
  } catch (error) {
    res.status(400).send(error);
  }
};

exports.getApplications = async (req, res) => {
  try {
    const applications = await Application.find().populate('jobId laborerId');
    res.status(200).send(applications);
  } catch (error) {
    res.status(500).send(error);
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('jobId laborerId');
    if (!application) {
      return res.status(404).send();
    }
    res.status(200).send(application);
  } catch (error) {
    res.status(500).send(error);
  }
};

exports.updateApplicationById = async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!application) {
      return res.status(404).send();
    }
    res.status(200).send(application);
  } catch (error) {
    res.status(400).send(error);
  }
};

exports.deleteApplicationById = async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) {
      return res.status(404).send();
    }
    res.status(200).send(application);
  } catch (error) {
    res.status(500).send(error);
  }
};
