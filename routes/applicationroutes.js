const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationcontroller');

router.post('/', applicationController.createApplication);
router.get('/', applicationController.getApplications);
router.get('/:id', applicationController.getApplicationById);
router.put('/:id', applicationController.updateApplicationById);
router.delete('/:id', applicationController.deleteApplicationById);

module.exports = router;
