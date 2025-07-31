import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
//import pool from './configs/db.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userAccessRoutes from './routes/userAccessRoutes.js';
import locationRoutes from './routes/locationManagementRoutes.js'
import productManagementRoutes from './routes/productManagementRoutes.js'
import vendorManagementRoutes from './routes/vendorManagementRoutes.js'
import purchaseOrderManagementRoutes from './routes/purchaseOrderManagementRoutes.js'
import invoicePaymentManagementRoutes from './routes/invoicePaymentManagementRoutes.js'
import grnRoutes from './routes/grnRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5080;

// Enable All CORS Requests
app.use(cors({
  //origin: 'http://localhost:4000',  
  origin: "https://erpsfrontend.onrender.com",  
  credentials: true,               
}));
app.use(express.json());

// 👉 Health Check
app.get('/', (req, res) => {
  res.send('ERP Backend is running ✅');
});

// API Routes
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/roleMap', userAccessRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/product', productManagementRoutes);
app.use('/api/vendor', vendorManagementRoutes);
app.use('/api/po', purchaseOrderManagementRoutes);
app.use('/api/invoice', invoicePaymentManagementRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/inventory', inventoryRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
