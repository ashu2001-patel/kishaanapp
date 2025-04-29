const Job = require('../models/Jobs');

// Create Job
exports.createJob = async (req, res) => {
  try {
    const job = new Job({
      ...req.body,
      employerId: req.user._id // Ensure user is authenticated
    });
    await job.save();
    res.status(201).json({ message: 'Job created successfully', job });
  } catch (error) {
    res.status(400).json({ message: 'Error creating job', error: error.message });
  }
};

// Get All Jobs
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find();
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobs', error: error.message });
  }
};

// Get Job By ID
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching job', error: error.message });
  }
};

// Update Job By ID
exports.updateJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Ensure the user updating the job is the one who created it
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this job' });
    }

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ message: 'Job updated successfully', updatedJob });
  } catch (error) {
    res.status(400).json({ message: 'Error updating job', error: error.message });
  }
};

// Delete Job By ID
exports.deleteJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Ensure the user deleting the job is the one who created it
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this job' });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting job', error: error.message });
  }
};
