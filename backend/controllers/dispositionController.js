const { Outcome } = require('../models');

// Default initial outcome values
const DEFAULT_OUTCOMES = [
  'ringing',
  'callback',
  'answer_disconnect',
  'switched_off',
  'donation_done',
  'interested',
  'not_interested',
  'dnc'
];

// @desc    Get all active outcomes
// @route   GET /api/dispositions
// @access  Private
exports.getDispositions = async (req, res) => {
  try {
    let outcomes = await Outcome.findAll({
      where: { isActive: true },
      order: [['label', 'ASC']]
    });

    // Auto-seed defaults if list is empty
    if (outcomes.length === 0) {
      const bulkData = DEFAULT_OUTCOMES.map(label => ({ label }));
      await Outcome.bulkCreate(bulkData);
      
      outcomes = await Outcome.findAll({
        where: { isActive: true },
        order: [['label', 'ASC']]
      });
    }

    res.status(200).json({ success: true, outcomes });
  } catch (error) {
    console.error('Get dispositions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add new outcome
// @route   POST /api/dispositions
// @access  Private (Admin Only)
exports.addDisposition = async (req, res) => {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ success: false, message: 'Please provide a disposition label.' });
  }

  const cleanLabel = label.trim().toLowerCase().replace(/\s+/g, '_');

  try {
    const existing = await Outcome.findOne({ where: { label: cleanLabel } });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        return res.status(200).json({ success: true, message: 'Disposition activated successfully.', outcome: existing });
      }
      return res.status(400).json({ success: false, message: 'Disposition already exists.' });
    }

    const outcome = await Outcome.create({ label: cleanLabel });
    res.status(201).json({ success: true, outcome, message: 'Outcome added successfully.' });
  } catch (error) {
    console.error('Add disposition error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete/Deactivate outcome
// @route   DELETE /api/dispositions/:id
// @access  Private (Admin Only)
exports.deleteDisposition = async (req, res) => {
  const { id } = req.params;

  try {
    const outcome = await Outcome.findByPk(id);
    if (!outcome) {
      return res.status(404).json({ success: false, message: 'Disposition not found.' });
    }

    // Soft delete / deactivate to maintain database call logging history constraints
    outcome.isActive = false;
    await outcome.save();

    res.status(200).json({ success: true, message: 'Disposition removed successfully.' });
  } catch (error) {
    console.error('Delete disposition error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
