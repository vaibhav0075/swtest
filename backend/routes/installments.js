const express = require('express');
const router = express.Router();
const Installment = require('../models/Installment');
const User = require('../models/User');
const InvestmentHistory = require('../models/InvestmentHistory');
const Fund = require('../models/Fund');
const authenticate = require('../middleware/authenticate');
const Logger = require('../services/logger');
const Loan = require('../models/Loan');
const mongoose = require('mongoose');
const Job = require('../models/Job');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Installments route is working' });
});

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all installments (admin only)
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const installments = await Installment.find(query)
      .populate('memberId', 'name memberId')
      .populate('recordedBy', 'name');
    res.json(installments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get installments for a specific member (admin only)
router.get('/member/:memberId', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { memberId: req.params.memberId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const installments = await Installment.find(query)
      .populate('memberId', 'name memberId')
      .populate('recordedBy', 'name');
    res.json(installments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get member's own installments
router.get('/my-installments', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { memberId: req.user.userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const installments = await Installment.find(query)
      .populate('memberId', 'name memberId')
      .populate('recordedBy', 'name')
      .sort({ date: -1 });
    res.json(installments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new installment
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { memberId, amount, date } = req.body;

    // Create installment
    const installment = new Installment({
      memberId,
      amount,
      date: date || new Date(),
      recordedBy: req.user.userId
    });

    await installment.save();

    // Update member's investment balance
    const member = await User.findById(memberId);
    if (member) {
      member.investmentBalance += amount;
      await member.save();

      // Create investment history entry
      const investmentHistory = new InvestmentHistory({
        memberId,
        amount,
        type: 'installment',
        refId: installment._id.toString()
      });
      await investmentHistory.save();
    }

    // Update total fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) + amount;
      await fund.save();
    } else {
      // Create new fund if it doesn't exist
      const newFund = new Fund({
        totalFund: amount
      });
      await newFund.save();
    }

    // Log the transaction
    await Logger.logInstallmentCreated(installment, req.user.userId);

    res.status(201).json(installment);
  } catch (error) {
    console.error('Installment creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an installment
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const installment = await Installment.findById(id);

    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    // 1. Revert member's investment balance
    const member = await User.findById(installment.memberId);
    if (member) {
      member.investmentBalance = (member.investmentBalance || 0) - installment.amount;
      await member.save();
    }

    // 2. Revert total fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) - installment.amount;
      await fund.save();
    }

    // 3. Delete associated InvestmentHistory entry
    await InvestmentHistory.deleteOne({ refId: id, type: 'installment' });

    // Get the loan for logging
    const loan = await Loan.findOne({ memberId: installment.memberId });
    
    // Log the repayment deletion before deleting
    if (loan) {
      await Logger.logRepaymentDeleted(loan, installment.amount, req.user.userId);
    }

    // 4. Delete the installment
    await Installment.findByIdAndDelete(id);

    res.status(200).json({ message: 'Installment deleted successfully' });
  } catch (error) {
    console.error('Installment deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an installment
router.patch('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // New amount for the installment

    if (typeof amount === 'undefined' || isNaN(parseFloat(amount))) {
      return res.status(400).json({ message: 'New installment amount is required and must be a number.' });
    }
    const newAmount = parseFloat(amount);

    const installment = await Installment.findById(id);
    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    const oldAmount = installment.amount; // Store the old amount
    const amountDifference = newAmount - oldAmount; // Positive if new > old, negative if new < old

    // 1. Update member's investment balance
    const member = await User.findById(installment.memberId);
    if (member) {
      member.investmentBalance = (member.investmentBalance || 0) + amountDifference;
      await member.save();
    }

    // 2. Update total fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) + amountDifference;
      await fund.save();
    }

    // 3. Update associated InvestmentHistory entry
    const investmentHistory = await InvestmentHistory.findOne({ refId: id, type: 'installment' });
    if (investmentHistory) {
      investmentHistory.amount = newAmount; // Update the amount in history
      await investmentHistory.save();
    }

    // 4. Update the installment
    installment.amount = newAmount;
    installment.date = new Date();
    await installment.save();

    // Get the loan for logging
    const loan = await Loan.findOne({ memberId: installment.memberId });
    
    // Log the repayment update
    if (loan) {
      await Logger.logRepaymentUpdated(loan, installment._id, oldAmount, newAmount, req.user.userId);
      
      // Update loan outstanding amount
      loan.outstanding = (loan.outstanding || loan.amount) - amountDifference;
      await loan.save();
    }

    res.status(200).json(installment);
  } catch (error) {
    console.error('Installment update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Diagnostic endpoint to check installments data
router.get('/diagnostic', authenticate, isAdmin, async (req, res) => {
  try {
    const installments = await Installment.find().populate('memberId', 'name memberId');
    const members = await User.find({ role: 'member' });
    
    // Standard installment amount
    const STANDARD_INSTALLMENT_AMOUNT = 1000;
    
    // Calculate totals
    const totalInstallments = installments.length;
    const totalAmount = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    const expectedAmount = totalInstallments * STANDARD_INSTALLMENT_AMOUNT; // Dynamic calculation
    const difference = totalAmount - expectedAmount;
    
    // Group by member
    const memberInstallments = {};
    installments.forEach(inst => {
      const memberName = inst.memberId ? inst.memberId.name : 'Unknown';
      const memberId = inst.memberId ? inst.memberId.memberId : 'Unknown';
      const key = `${memberName} (${memberId})`;
      
      if (!memberInstallments[key]) {
        memberInstallments[key] = {
          count: 0,
          total: 0,
          installments: []
        };
      }
      
      memberInstallments[key].count++;
      memberInstallments[key].total += inst.amount || 0;
      memberInstallments[key].installments.push({
        amount: inst.amount,
        date: inst.date,
        id: inst._id
      });
    });
    
    // Find members without installments
    const membersWithoutInstallments = members.filter(member => {
      const memberInstallmentCount = installments.filter(inst => 
        inst.memberId && inst.memberId._id.toString() === member._id.toString()
      ).length;
      return memberInstallmentCount === 0;
    });
    
    // Find members with only 1 installment
    const membersWithOneInstallment = members.filter(member => {
      const memberInstallmentCount = installments.filter(inst => 
        inst.memberId && inst.memberId._id.toString() === member._id.toString()
      ).length;
      return memberInstallmentCount === 1;
    });
    
    // Find non-standard installments (not ₹1000)
    const nonStandardInstallments = installments.filter(inst => inst.amount !== STANDARD_INSTALLMENT_AMOUNT);
    
    res.json({
      summary: {
        totalInstallments,
        totalAmount,
        expectedAmount,
        difference,
        totalMembers: members.length,
        expectedMembers: members.length,
        standardInstallmentAmount: STANDARD_INSTALLMENT_AMOUNT
      },
      memberInstallments,
      membersWithoutInstallments: membersWithoutInstallments.map(m => ({
        name: m.name,
        memberId: m.memberId
      })),
      membersWithOneInstallment: membersWithOneInstallment.map(m => ({
        name: m.name,
        memberId: m.memberId
      })),
      nonStandardInstallments: nonStandardInstallments.map(inst => ({
        amount: inst.amount,
        date: inst.date,
        memberName: inst.memberId ? inst.memberId.name : 'Unknown',
        memberId: inst.memberId ? inst.memberId.memberId : 'Unknown'
      }))
    });
  } catch (error) {
    console.error('Installments diagnostic error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Job status endpoint
router.get('/quick-add/status/:jobId', authenticate, isAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ status: job.status, progress: job.progress, total: job.total, error: job.error, result: job.result });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk quick-add installments to all members (fast, atomic-ish)
router.post('/quick-add', authenticate, isAdmin, async (req, res) => {
  try {
    const { amount = 1000, date } = req.body;
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const targetDate = new Date(date);
    const members = await User.find({ role: 'member', paused: false }).select('_id');
    if (!members || members.length === 0) {
      return res.status(400).json({ message: 'No active members found' });
    }

    // Create job
    const job = await Job.create({
      type: 'quick_add_installments',
      status: 'pending',
      total: members.length,
      progress: 0,
      meta: { amount, date: targetDate, performedBy: req.user.userId }
    });

    // Start async processing (fire-and-forget)
    setImmediate(async () => {
      try {
        job.status = 'running';
        await job.save();

        // Prepare bulk writes
        const installmentInserts = members.map(m => ({
          insertOne: {
            document: {
              memberId: m._id,
              amount,
              date: targetDate,
              recordedBy: req.user.userId
            }
          }
        }));
        await Installment.bulkWrite(installmentInserts);

        // Re-query created installments
        const createdInstallments = await Installment.find({ amount, date: targetDate, recordedBy: req.user.userId }).select('_id memberId amount');

        // Bulk update members and histories in chunks to avoid memory spikes
        const chunkSize = 500;
        for (let i = 0; i < members.length; i += chunkSize) {
          const chunkMembers = members.slice(i, i + chunkSize);
          const updates = chunkMembers.map(m => ({ updateOne: { filter: { _id: m._id }, update: { $inc: { investmentBalance: amount } } } }));
          await User.bulkWrite(updates);
          job.progress = Math.min(job.total, i + chunkMembers.length);
          await job.save();
        }

        // Update fund
        const fund = await Fund.findOne();
        if (fund) {
          fund.totalFund = (fund.totalFund || 0) + amount * members.length;
          await fund.save();
        } else {
          const newFund = new Fund({ totalFund: amount * members.length });
          await newFund.save();
        }

        // Histories in chunks
        for (let i = 0; i < createdInstallments.length; i += chunkSize) {
          const chunk = createdInstallments.slice(i, i + chunkSize);
          const historyInserts = chunk.map(ci => ({ insertOne: { document: { memberId: ci.memberId, amount: ci.amount, type: 'installment', refId: ci._id.toString() } } }));
          await InvestmentHistory.bulkWrite(historyInserts);
        }

        await Logger.logTransaction({
          type: 'installment',
          action: 'created',
          amount: amount * members.length,
          memberName: 'Bulk Quick Add',
          memberIdCode: 'BULK',
          referenceType: 'installment_bulk',
          description: `Quick add ₹${amount} to ${members.length} members on ${targetDate.toISOString().slice(0,10)}`,
          performedBy: req.user.userId,
          performedByName: 'Admin',
          fundImpact: amount * members.length,
          balancesBefore: {},
          balancesAfter: {},
          additionalData: { count: members.length, amountPerMember: amount, date: targetDate }
        });

        job.status = 'completed';
        job.result = { inserted: members.length };
        job.progress = job.total;
        await job.save();
      } catch (err) {
        job.status = 'failed';
        job.error = err?.message || 'Unknown error';
        await job.save();
      }
    });

    res.status(202).json({ jobId: job._id });
  } catch (error) {
    console.error('Quick add installments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 