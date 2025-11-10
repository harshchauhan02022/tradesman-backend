const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');

const signToken = (admin) => {
    return jwt.sign(
        { id: admin.id, role: admin.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        const token = signToken(admin);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existing = await Admin.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const admin = await Admin.create({ name, email, password: hashed });

        res.status(201).json({ message: 'Admin created successfully', admin });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

