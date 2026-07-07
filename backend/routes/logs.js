const express = require('express');
const router = express.Router();
const TransactionLog = require('../models/TransactionLog');
const LoginLog = require('../models/LoginLog');
const MemberLog = require('../models/MemberLog');
const authenticate = require('../middleware/authenticate');
const User = require('../models/User');

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

// Get transaction logs
router.get('/transactions', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, type, memberId, page = 1, limit = 50 } = req.query;
    const query = {};

    // Date range filter
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

    // Type filter
    if (type) {
      query.type = type;
    }

    // Member filter
    if (memberId) {
      query.memberId = memberId;
    }

    const skip = (page - 1) * limit;
    
    const logs = await TransactionLog.find(query)
      .populate('memberId', 'name memberId')
      .populate('performedBy', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TransactionLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalLogs: total,
        hasNext: skip + logs.length < total,
        hasPrev: page > 1
      },
      balanceSummary: {
        totalFundImpact: logs.reduce((sum, log) => sum + (log.fundImpact || 0), 0),
        averageFundBalance: logs.length > 0 ? logs.reduce((sum, log) => sum + (log.balancesAfter?.fundBalance || 0), 0) / logs.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching transaction logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get login logs
router.get('/logins', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, action, userId, success, page = 1, limit = 50 } = req.query;
    const query = {};

    // Date range filter
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

    // Action filter
    if (action) {
      query.action = action;
    }

    // User filter
    if (userId) {
      query.userId = userId;
    }

    // Success filter
    if (success !== undefined) {
      query.success = success === 'true';
    }

    const skip = (page - 1) * limit;
    
    const logs = await LoginLog.find(query)
      .populate('userId', 'name memberId role')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LoginLog.countDocuments(query);

    // Calculate login stats instead of balance summary
    const successCount = logs.filter(log => log.success).length;
    const failureCount = logs.filter(log => !log.success).length;

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalLogs: total,
        hasNext: skip + logs.length < total,
        hasPrev: page > 1
      },
      loginStats: {
        totalLogins: logs.length,
        successCount,
        failureCount,
        successRate: logs.length > 0 ? (successCount / logs.length * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching login logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get member logs
router.get('/members', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, action, memberId, performedBy, page = 1, limit = 50 } = req.query;
    const query = {};

    // Date range filter
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

    // Action filter
    if (action) {
      query.action = action;
    }

    // Member filter
    if (memberId) {
      query.memberId = memberId;
    }

    // Performed by filter
    if (performedBy) {
      query.performedBy = performedBy;
    }

    const skip = (page - 1) * limit;
    
    const logs = await MemberLog.find(query)
      .populate('memberId', 'name memberId')
      .populate('performedBy', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MemberLog.countDocuments(query);

    // Calculate member activity stats instead of balance summary
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalLogs: total,
        hasNext: skip + logs.length < total,
        hasPrev: page > 1
      },
      memberStats: {
        totalActivities: logs.length,
        actionCounts
      }
    });
  } catch (error) {
    console.error('Error fetching member logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get detailed transaction log with balance information
router.get('/transactions/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await TransactionLog.findById(id)
      .populate('memberId', 'name memberId')
      .populate('performedBy', 'name');
    
    if (!log) {
      return res.status(404).json({ message: 'Transaction log not found' });
    }

    // Calculate balance changes
    const fundBalanceChange = log.balancesAfter?.fundBalance - log.balancesBefore?.fundBalance;
    const investmentBalanceChange = log.balancesAfter?.memberInvestmentBalance - log.balancesBefore?.memberInvestmentBalance;
    const interestEarnedChange = log.balancesAfter?.memberInterestEarned - log.balancesBefore?.memberInterestEarned;

    res.json({
      log,
      balanceChanges: {
        fundBalance: {
          before: log.balancesBefore?.fundBalance || 0,
          after: log.balancesAfter?.fundBalance || 0,
          change: fundBalanceChange || 0
        },
        memberInvestmentBalance: {
          before: log.balancesBefore?.memberInvestmentBalance || 0,
          after: log.balancesAfter?.memberInvestmentBalance || 0,
          change: investmentBalanceChange || 0
        },
        memberInterestEarned: {
          before: log.balancesBefore?.memberInterestEarned || 0,
          after: log.balancesAfter?.memberInterestEarned || 0,
          change: interestEarnedChange || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transaction log details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get log statistics
router.get('/statistics', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateQuery = {};

    if (startDate || endDate) {
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
    }

    // Transaction statistics
    const transactionStats = await TransactionLog.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Login statistics
    const loginStats = await LoginLog.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: ['$success', 1, 0] }
          }
        }
      }
    ]);

    // Member statistics
    const memberStats = await MemberLog.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent activity summary
    const recentTransactions = await TransactionLog.find(dateQuery)
      .sort({ date: -1 })
      .limit(10)
      .populate('memberId', 'name memberId')
      .populate('performedBy', 'name');

    const recentLogins = await LoginLog.find(dateQuery)
      .sort({ date: -1 })
      .limit(10)
      .populate('userId', 'name memberId role');

    const recentMemberChanges = await MemberLog.find(dateQuery)
      .sort({ date: -1 })
      .limit(10)
      .populate('memberId', 'name memberId')
      .populate('performedBy', 'name');

    res.json({
      transactionStats,
      loginStats,
      memberStats,
      recentActivity: {
        transactions: recentTransactions,
        logins: recentLogins,
        memberChanges: recentMemberChanges
      }
    });
  } catch (error) {
    console.error('Error fetching log statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export logs to CSV (basic implementation)
router.get('/export/:type', authenticate, isAdmin, async (req, res) => {
  try {
    const { type } = req.params;
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

    let logs = [];
    let filename = '';

    switch (type) {
      case 'transactions':
        logs = await TransactionLog.find(query)
          .populate('memberId', 'name memberId')
          .populate('performedBy', 'name')
          .sort({ date: -1 });
        filename = 'transaction_logs.csv';
        break;
      case 'logins':
        logs = await LoginLog.find(query)
          .populate('userId', 'name memberId role')
          .sort({ date: -1 });
        filename = 'login_logs.csv';
        break;
      case 'members':
        logs = await MemberLog.find(query)
          .populate('memberId', 'name memberId')
          .populate('performedBy', 'name')
          .sort({ date: -1 });
        filename = 'member_logs.csv';
        break;
      default:
        return res.status(400).json({ message: 'Invalid log type' });
    }

    // Convert to CSV format (simplified)
    const csvData = logs.map(log => {
      return Object.values(log.toObject()).join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 