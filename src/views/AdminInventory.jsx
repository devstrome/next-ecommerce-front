'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getStorage } from "../lib/storage";
import { toast } from 'react-toastify';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaArrowLeft, 
  FaSearch, 
  FaBarcode,
  FaQrcode,
  FaPrint,
  FaCamera,
  FaBox,
  FaClipboardList,
  FaTruck,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaEye,
  FaDownload,
  FaUpload,
  FaWarehouse,
  FaMapMarkerAlt,
  FaLayerGroup,
  FaCubes,
  FaListUl
} from 'react-icons/fa';
import { useRouter } from "next/navigation";
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { useAdmin } from '../context/AdminContext';
import QRScanner from '../components/QRScanner';
import Barcode from '../components/Barcode';
import { printDocument } from '../lib/print';
import { printThermalLabels } from '../lib/print/thermal';
import { formatMeasureLine } from '../lib/measure';
import { formatBDT } from '../config/brand';

// Human measure line for an inventory item: 'Size: M' / 'Volume: 30 ml'
const itemMeasure = (i) =>
  formatMeasureLine({
    measureType: i?.measureType || i?.variantId?.measureType,
    unitName: i?.unitName || i?.variantId?.unitName,
    size: i?.size
  });

const AdminInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState(1);
  const [scannedCode, setScannedCode] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanMode, setScanMode] = useState('qr');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [variantStock, setVariantStock] = useState({});
  const [printQuantities, setPrintQuantities] = useState({});
  const [printSettings, setPrintSettings] = useState({
    printerType: 'normal',
    labelSize: 'medium',
    showQRCode: true,
    showProductInfo: true,
    qrCodeType: 'qrCode',
    qrCodeSize: 'medium'
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    productId: '',
    variantId: '',
    color: '',
    size: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0
  });
  const [formData, setFormData] = useState({
    productId: '',
    variantId: '',
    size: '',
    stockQuantity: 1,
    price: 0,
    discountPrice: 0,
    manualPricing: false,
    location: {
      warehouse: 'Main Warehouse',
      shelf: '',
      section: ''
    },
    notes: ''
  });
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAdmin();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Please log in as admin to access this page');
      router.push('/admin');
      return;
    }
    
    if (isAuthenticated) {
      fetchInventory();
      fetchProducts();
      fetchOrders();
      fetchStats();
    }
  }, [pagination.page, filters, isAuthenticated, authLoading]);

  useEffect(() => {
    if (formData.productId) {
      const product = products.find(p => p._id === formData.productId);
      setSelectedProduct(product);
      if (product && product.variants) {
        setAvailableVariants(product.variants);
      } else {
        setAvailableVariants([]);
      }
    } else {
      setSelectedProduct(null);
      setAvailableVariants([]);
    }
  }, [formData.productId, products]);

  // Populate the form whenever an inventory item is selected for editing
  // (covers Quick Scan / manual code lookup, which previously left the form blank)
  useEffect(() => {
    if (!selectedInventory) return;
    setFormData({
      productId: selectedInventory.productId?._id || selectedInventory.productId || '',
      variantId: selectedInventory.variantId?._id || selectedInventory.variantId || '',
      size: selectedInventory.size || '',
      stockQuantity: selectedInventory.stockQuantity || 1,
      price: selectedInventory.price || 0,
      discountPrice: selectedInventory.discountPrice || 0,
      manualPricing: true,
      location: selectedInventory.location || { warehouse: 'Main Warehouse', shelf: '', section: '' },
      notes: selectedInventory.notes || ''
    });
  }, [selectedInventory]);

  // Cascading filter options: product -> variant -> color -> size
  const filterProduct = products.find(p => p._id === filters.productId) || null;
  const filterVariants = filterProduct?.variants || [];
  const filterColors = [...new Set(filterVariants.map(v => v.colorName || 'Default'))];
  const filterVariant = filters.variantId ? filterVariants.find(v => v._id === filters.variantId) : null;
  const filterSizes = filterVariant
    ? (filterVariant.sizes || [])
    : [...new Set(
        filterVariants
          .filter(v => !filters.color || (v.colorName || 'Default') === filters.color)
          .flatMap(v => v.sizes || [])
      )];

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory?${params}`, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
      });

      setInventory(response.data.inventory);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch inventory');
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products`, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/allorders`, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
      });
      setOrders(response.data.orders || response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory/stats`, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAllInventoryIds = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory?limit=10000&page=1`, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
      });
      const allInventoryIds = response.data.inventory.map(item => item._id);
      setSelectedItems(allInventoryIds);
      toast.success(`All ${allInventoryIds.length} items selected`);
    } catch (error) {
      console.error('Error fetching all inventory IDs:', error);
      toast.error('Failed to select all items');
    }
  };

  const handleCreateInventory = async () => {
    try {
      if (bulkMode) {
        if (selectedVariants.length === 0) {
          toast.error('Please select at least one variant');
          return;
        }

        const bulkData = [];
        for (const variantId of selectedVariants) {
          const variant = availableVariants.find(v => v._id === variantId);
          if (variant && variant.sizes && variant.sizes.length > 0) {
            for (let i = 0; i < variant.sizes.length; i++) {
              const size = variant.sizes[i];
              const stockQuantity = variantStock[variantId]?.[size] || 0;
              if (stockQuantity > 0) {
                const price = variant.prices?.[i] || variant.prices?.[0] || 0;
                const discountPrice = variant.discountPrices?.[i] || 0;
                
                bulkData.push({
                  productId: formData.productId,
                  variantId: variant._id,
                  size: size,
                  stockQuantity: stockQuantity,
                  price: price,
                  discountPrice: discountPrice,
                  location: formData.location,
                  notes: formData.notes
                });
              }
            }
          }
        }

        if (bulkData.length === 0) {
          toast.error('Please set stock quantities for at least one size');
          return;
        }

        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory/bulk`, {
          inventoryItems: bulkData
        }, { headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });

        const totalIndividualItems = bulkData.reduce((sum, item) => sum + item.stockQuantity, 0);
        toast.success(`Created ${totalIndividualItems} individual barcodes and QR codes for ${bulkData.length} variant/size combinations`);
      } else {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory`, formData, {
          headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
        });
        toast.success('Inventory created successfully');
      }

      fetchInventory();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create inventory');
    }
  };

  const handleUpdateInventory = async () => {
    try {
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory/${selectedInventory._id}`, formData, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
      });
      toast.success('Inventory updated successfully');
      fetchInventory();
      setShowModal(false);
      setSelectedInventory(null);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update inventory');
    }
  };

     const handleDeleteInventory = async (id) => {
     if (!window.confirm('Are you sure you want to delete this inventory item?')) {
       return;
     }

     try {
       await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory/${id}`, {
         headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
       });
       toast.success('Inventory deleted successfully');
       fetchInventory();
     } catch (error) {
       toast.error(error.response?.data?.message || 'Failed to delete inventory');
     }
   };

   const handleDeleteAllSelected = async () => {
     try {
       const deletePromises = selectedItems.map(id => 
         axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory/${id}`, {
           headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
         })
       );
       
       await Promise.all(deletePromises);
       
       toast.success(`${selectedItems.length} inventory items deleted successfully`);
       setSelectedItems([]);
       fetchInventory();
     } catch (error) {
       toast.error('Failed to delete some inventory items');
       console.error('Error deleting inventory items:', error);
    }
  };

  const handleRestock = async () => {
    if (!restockItem || !restockQuantity || restockQuantity < 1) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory/restock`, {
        items: [{ id: restockItem._id, quantity: restockQuantity }]
      }, { headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });

      const updated = response.data.results?.[0];
      toast.success(`Restocked! Now available: ${updated?.availableQuantity || restockQuantity}`);
      setShowRestockModal(false);
      setRestockItem(null);
      setRestockQuantity(1);
      fetchInventory();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to restock inventory');
    }
  };

  const handleScanCode = async () => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory/scan`, 
        { code: scannedCode },
        { headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } }
      );

      setSelectedInventory(response.data.inventory);
      setShowScanModal(false);
      setShowModal(true);
      setScannedCode('');
    } catch (error) {
      toast.error('Code not found');
    }
  };

  const handleQRScan = async (scannedData) => {
    try {
      
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory/scan`, 
        { code: scannedData },
        { headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } }
      );

      setSelectedInventory(response.data.inventory);
      setShowQRScanner(false);
      setShowModal(true);
      toast.success(`Inventory item found! Product: ${response.data.inventory.productId?.name}`);
    } catch (error) {
      console.error('QR Scanner: Error scanning code:', error);
      toast.error(`Inventory item not found for code: ${scannedData}`);
      
      setScannedCode(scannedData);
      setShowScanModal(true);
    }
  };

  const handleOpenQRScanner = (mode = 'qr') => {
    setScanMode(mode);
    setShowQRScanner(true);
  };

  const handleAssignToOrder = async (inventoryId, orderId, quantity) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/inventory/assign`, 
        { inventoryId, orderId, quantity },
        { headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } }
      );

      toast.success('Inventory assigned to order successfully');
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign inventory');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      // Cascade: changing a higher level clears the lower ones
      if (key === 'productId') {
        next.variantId = '';
        next.color = '';
        next.size = '';
      } else if (key === 'color') {
        next.variantId = '';
        next.size = '';
      } else if (key === 'variantId') {
        const product = products.find(p => p._id === next.productId);
        const variant = product?.variants?.find(v => v._id === value);
        next.color = value ? (variant?.colorName || 'Default') : '';
        next.size = '';
      }
      return next;
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      variantId: '',
      size: '',
      stockQuantity: 1,
      price: 0,
      discountPrice: 0,
      manualPricing: false,
      location: {
        warehouse: 'Main Warehouse',
        shelf: '',
        section: ''
      },
      notes: ''
    });
    setSelectedProduct(null);
    setAvailableVariants([]);
    setBulkMode(false);
    setSelectedVariants([]);
    setVariantStock({});
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'inactive':
        return 'text-[#4A4A4A] bg-[#F4F4F4] border-[#BDBDBD]';
      case 'out_of_stock':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-[#4A4A4A] bg-[#F4F4F4] border-[#BDBDBD]';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <FaCheckCircle className="text-green-600" />;
      case 'inactive':
        return <FaTimes className="text-[#4A4A4A]" />;
      case 'out_of_stock':
        return <FaExclamationTriangle className="text-red-600" />;
      default:
        return <FaBox className="text-[#4A4A4A]" />;
    }
  };

  const generatePrintContent = () => {
    const labels = [];
    selectedItems.forEach(itemId => {
      const item = inventory.find(inv => inv._id === itemId);
      if (!item) return;

      const quantity = printQuantities[itemId] || item.stockQuantity || 1;
      const showInfo = printSettings.showProductInfo;

      for (let i = 0; i < quantity; i++) {
        labels.push({
          productName: showInfo ? item.productId?.name : '',
          size: showInfo ? item.size : '',
          measureType: item.measureType || item.variantId?.measureType,
          unitName: item.unitName || item.variantId?.unitName,
          colorName: showInfo ? item.color?.name : '',
          hexCode: item.color?.hexCode,
          barcode: printSettings.qrCodeType === 'qrCode' ? '' : item.barcode,
          qrCode: item.qrCode,
          qrDataUri: printSettings.qrCodeType !== 'barcode' && item.qrCode ? generateQRCodeDataURI(item.qrCode, 60) : '',
          price: item.price,
          discountPrice: item.discountPrice,
        });
      }
    });
    return labels;
  };

  const generateSVGQRCodeSync = (text, size = 20) => {
    if (!text || text.trim() === '') {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" preserveAspectRatio="xMidYMid meet">
        <rect width="${size}" height="${size}" fill="#ffffff"/>
        <text x="${size/2}" y="${size/2}" text-anchor="middle" dy=".3em" font-size="${size/4}" fill="#cccccc" font-family="monospace">QR</text>
      </svg>`;
    }

    try {
      const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
      const n = qr.modules.size;
      const cell = size / n;
      const gap = Math.max(cell * 0.08, 0.3);
      const dot = cell - gap;
      let cells = '';
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (qr.modules.data[r * n + c]) {
            cells += `<rect x="${c * cell + gap/2}" y="${r * cell + gap/2}" width="${dot}" height="${dot}" fill="#000"/>`;
          }
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" preserveAspectRatio="xMidYMid meet">
        <rect width="${size}" height="${size}" fill="#fff"/>${cells}</svg>`;
    } catch {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" preserveAspectRatio="xMidYMid meet">
        <rect width="${size}" height="${size}" fill="#fff"/>
        <text x="${size/2}" y="${size/2}" text-anchor="middle" font-family="monospace" font-size="${Math.max(size/8, 6)}" fill="#000">${text}</text>
      </svg>`;
    }
  };

  const generateQRCodeDataURI = (text, size = 40) => {
    if (!text || text.trim() === '') return '';
    try {
      const svgStr = generateSVGQRCodeSync(text, size);
      const base64 = btoa(unescape(encodeURIComponent(svgStr)));
      return `data:image/svg+xml;base64,${base64}`;
    } catch { return ''; }
  };

  const generateBarcodeSync = (text) => {
    if (!text || text.trim() === '') {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30" width="100%" height="100%">
        <rect width="100" height="30" fill="#fff"/>
        <text x="50" y="18" text-anchor="middle" font-family="monospace" font-size="8" fill="#999">No Barcode</text>
      </svg>`;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 80;
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: false,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 5,
      });
      return `<img src="${canvas.toDataURL('image/png')}" style="width:100%;max-height:12mm;" />`;
    } catch {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 25" width="100%" height="100%">
        <rect width="80" height="25" fill="#fff"/>
        <text x="40" y="15" text-anchor="middle" font-family="monospace" font-size="5" fill="#000">${text}</text>
      </svg>`;
    }
  };

  const buildA4StickerSheetHTML = (labels) => {
    const stickersHTML = labels.map(item => {
      const showBarcode = printSettings.qrCodeType !== 'qrCode';
      const showQR = printSettings.qrCodeType !== 'barcode';
      const barcodeImg = showBarcode && item.barcode ? generateBarcodeSync(item.barcode) : '';
      const qrImg = showQR && item.qrCode ? `<img src="${generateQRCodeDataURI(item.qrCode, 48)}" style="width:100%;height:100%;" />` : '';
      const measure = formatMeasureLine({ measureType: item.measureType, unitName: item.unitName, size: item.size });
      const discountBlock = item.discountPrice
        ? `<span class="old">${formatBDT(item.price)}</span>${formatBDT(item.discountPrice)}`
        : item.price ? formatBDT(item.price) : '';
      const colorBlock = item.colorName
        ? `<div class="sticker-color"><span class="swatch" style="background:${item.hexCode || '#999'}"></span> ${item.colorName}</div>`
        : '';

      return `
          <div class="sticker">
            <div class="sticker-name">${item.productName || 'Product'}</div>
            ${colorBlock}
            <div class="sticker-size">${measure || 'N/A'}</div>
            <div class="sticker-price">${discountBlock}</div>
            ${barcodeImg ? `<div class="sticker-barcode">${barcodeImg}</div>` : ''}
            ${qrImg ? `<div class="sticker-qr">${qrImg}</div>` : ''}
          </div>`;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Stickers</title>
            <style>
              @page {
                size: A4;
                margin: 8mm 8mm 12mm;
                @bottom-center { content: "Page " counter(page) " of " counter(pages); font-family: Arial, sans-serif; font-size: 8pt; color: #888; }
                @bottom-left { content: "BELORELLA"; font-family: Arial, sans-serif; font-size: 7.5pt; color: #999; }
              }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
              .sticker-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2mm; }
              .sticker { border: 0.5px solid #ccc; border-radius: 2px; padding: 2mm; text-align: center; break-inside: avoid; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 35mm; background: white; }
              .sticker-name { font-size: 7px; font-weight: 700; text-transform: uppercase; line-height: 1.1; max-height: 8mm; overflow: hidden; word-break: break-word; }
              .sticker-size { font-size: 6px; background: #f0f0f0; padding: 0.5mm 1mm; border-radius: 1px; border: 0.3px solid #ddd; display: inline-block; }
              .sticker-color { font-size: 5.5px; color: #555; }
              .swatch { width: 5px; height: 5px; border-radius: 50%; border: 0.3px solid #ccc; display: inline-block; vertical-align: middle; margin-right: 1px; }
              .sticker-price { font-size: 7px; font-weight: 700; color: #DC143C; }
              .sticker-price .old { text-decoration: line-through; color: #999; font-size: 5.5px; font-weight: 400; margin-right: 1px; }
              .sticker-barcode img { width: 80%; max-height: 12mm; }
              .sticker-qr { width: 12mm; height: 12mm; }
              .sticker-qr img { width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <div class="sticker-grid">
              ${stickersHTML}
            </div>
          </body>
        </html>
      `;
  };
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#FAF8F6] p-4 sm:p-6">
      <div className="w-full max-w-7xl mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-[#4A4A4A] hover:text-[#1B1B1B] transition min-w-[44px] min-h-[44px] justify-center"
              aria-label="Go Back"
            >
              <FaArrowLeft className="text-2xl" />
            </button>
            <div className="flex items-center space-x-4">
              <img 
                src="/logo.png" 
                alt="BELORELLA" 
                className="h-12 w-auto object-contain"
              />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Inventory Management</h1>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center bg-white rounded-md shadow-sm border border-[#F4F4F4]">
              <FaSearch className="text-[#BDBDBD] ml-2" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="px-4 py-2 w-full sm:w-64 rounded-r-md focus:outline-none bg-white focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B] min-h-[44px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenQRScanner('qr')}
                className="flex items-center bg-[#1B1B1B] text-white px-4 py-2 rounded hover:bg-[#4A4A4A] transition min-h-[44px]"
              >
                <FaQrcode className="mr-2" /> <span className="hidden sm:inline">Scan QR</span><span className="sm:hidden">QR</span>
              </button>
              <button
                onClick={() => handleOpenQRScanner('barcode')}
                className="flex items-center bg-[#4A4A4A] text-white px-4 py-2 rounded hover:bg-[#1B1B1B] transition min-h-[44px]"
              >
                <FaBarcode className="mr-2" /> <span className="hidden sm:inline">Scan Barcode</span><span className="sm:hidden">Barcode</span>
              </button>
              <button
                onClick={() => setShowScanModal(true)}
                className="flex items-center bg-[#B1123B] text-white px-4 py-2 rounded hover:bg-[#1B1B1B] transition min-h-[44px]"
              >
                <FaCamera className="mr-2" /> <span className="hidden sm:inline">Manual Input</span><span className="sm:hidden">Manual</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            onClick={() => {
              setBulkMode(true);
              setShowModal(true);
            }}
            className="flex items-center bg-[#1B1B1B] text-white px-4 py-2 rounded hover:bg-[#4A4A4A] transition min-h-[44px]"
          >
            <FaCubes className="mr-2" /> <span className="hidden sm:inline">Bulk Create</span><span className="sm:hidden">Bulk</span>
          </button>
          <button
            onClick={() => {
              if (selectedItems.length > 0) {
                setShowPrintModal(true);
              } else {
                toast.info('Please select items to print');
              }
            }}
            className="flex items-center bg-[#4A4A4A] text-white px-4 py-2 rounded hover:bg-[#1B1B1B] transition min-h-[44px]"
          >
            <FaPrint className="mr-2" /> <span className="hidden sm:inline">Print Codes</span><span className="sm:hidden">Print</span>
          </button>

          <button
            onClick={() => {
              if (selectedItems.length > 0) {
                if (window.confirm(`Are you sure you want to delete ${selectedItems.length} selected inventory items? This action cannot be undone.`)) {
                  handleDeleteAllSelected();
                }
              } else {
                toast.info('Please select items to delete');
              }
            }}
            className="flex items-center bg-[#B1123B] text-white px-4 py-2 rounded hover:bg-[#1B1B1B] transition min-h-[44px]"
          >
            <FaTrash className="mr-2" /> <span className="hidden sm:inline">Delete All</span><span className="sm:hidden">Delete</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-7xl mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#F4F4F4] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Total Items</p>
                <p className="text-2xl font-bold text-[#1B1B1B]">{stats.totalItems || 0}</p>
              </div>
              <div className="w-12 h-12 bg-[#F4F4F4] rounded-full flex items-center justify-center">
                <FaBox className="text-[#B1123B] text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#F4F4F4] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Active Items</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeItems || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#F4F4F4] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Assigned Items</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#F4F4F4] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Available Items</p>
                <p className="text-2xl font-bold text-[#1B1B1B]">{stats.totalAvailable || 0}</p>
              </div>
              <div className="w-12 h-12 bg-[#F4F4F4] rounded-full flex items-center justify-center">
                <FaWarehouse className="text-[#B1123B] text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mb-8">
        <div className="bg-white border border-[#F4F4F4] rounded-lg p-4 sm:p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-[#1B1B1B]">
            <FaClipboardList className="mr-2 text-[#B1123B]" />
            Filter Inventory
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Status</label>
                             <select
                 value={filters.status}
                 onChange={(e) => handleFilterChange('status', e.target.value)}
                 className="w-full px-4 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B]"
               >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Product</label>
                             <select
                 value={filters.productId}
                 onChange={(e) => handleFilterChange('productId', e.target.value)}
                 className="w-full px-4 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B]"
               >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Variant</label>
              <select
                value={filters.variantId}
                onChange={(e) => handleFilterChange('variantId', e.target.value)}
                disabled={!filters.productId}
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B] disabled:bg-[#F4F4F4] disabled:text-[#BDBDBD]"
              >
                <option value="">{filters.productId ? 'All Variants' : 'Select a product first'}</option>
                {filterVariants.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.colorName || 'Default'}{v.sizes?.length ? ` — ${v.sizes.join(', ')}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Color</label>
              <select
                value={filters.color}
                onChange={(e) => handleFilterChange('color', e.target.value)}
                disabled={!filters.productId}
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B] disabled:bg-[#F4F4F4] disabled:text-[#BDBDBD]"
              >
                <option value="">{filters.productId ? 'All Colors' : 'Select a product first'}</option>
                {filterColors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Size</label>
              <select
                value={filters.size}
                onChange={(e) => handleFilterChange('size', e.target.value)}
                disabled={!filters.productId}
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B] disabled:bg-[#F4F4F4] disabled:text-[#BDBDBD]"
              >
                <option value="">{filters.productId ? 'All Sizes' : 'Select a product first'}</option>
                {filterSizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ search: '', status: '', productId: '', variantId: '', color: '', size: '' });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full px-4 py-2 bg-[#F4F4F4] text-[#4A4A4A] rounded hover:bg-[#BDBDBD] transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl">
        <div className="bg-white border border-[#F4F4F4] rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B1123B] mx-auto mb-4"></div>
              <p className="text-[#4A4A4A]">Loading inventory...</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-8 text-center">
              <FaBox className="text-[#BDBDBD] text-4xl mx-auto mb-4" />
              <p className="text-[#4A4A4A]">No inventory items found</p>
            </div>
          ) : (
            <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-[#F4F4F4]">
                                         <th className="py-3 px-4 border-b text-center font-semibold text-[#1B1B1B]">
                       <div className="flex flex-col items-center space-y-1">
                                                   <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                fetchAllInventoryIds();
                              } else {
                                setSelectedItems([]);
                              }
                            }}
                            checked={selectedItems.length === pagination.total && pagination.total > 0}
                            className="rounded border-[#BDBDBD] text-[#B1123B] focus:ring-[#B1123B]"
                          />
                                                   <button
                            onClick={() => {
                              if (selectedItems.length === pagination.total) {
                                setSelectedItems([]);
                                toast.info('All items deselected');
                              } else {
                                fetchAllInventoryIds();
                              }
                            }}
                            className="text-xs text-[#B1123B] hover:text-[#1B1B1B] font-medium"
                          >
                            {selectedItems.length === pagination.total ? 'Deselect All' : 'Select All'}
                          </button>
                          <button
                            onClick={() => {
                              const pageIds = inventory.map(item => item._id);
                              const allPageSelected = pageIds.every(id => selectedItems.includes(id));
                              if (allPageSelected) {
                                setSelectedItems(prev => prev.filter(id => !pageIds.includes(id)));
                              } else {
                                setSelectedItems(prev => [...new Set([...prev, ...pageIds])]);
                              }
                            }}
                            className="text-[10px] text-[#4A4A4A] hover:text-[#B1123B] font-medium"
                          >
                            {inventory.every(item => selectedItems.includes(item._id)) ? 'Deselect Page' : 'Select Page'}
                          </button>
                       </div>
                     </th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Product</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Variant/Size</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Individual Barcode/QR</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Stock</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Status</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Location</th>
                    <th className="py-3 px-4 border-b text-center font-semibold text-[#1B1B1B]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item._id} className="hover:bg-[#FAF8F6] border-b border-[#F4F4F4]">
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(prev => [...prev, item._id]);
                            } else {
                              setSelectedItems(prev => prev.filter(id => id !== item._id));
                            }
                          }}
                          className="rounded border-[#BDBDBD] text-[#B1123B] focus:ring-[#B1123B]"
                        />
                      </td>
                                             <td className="py-3 px-4 font-medium text-[#1B1B1B]">
                         <div className="flex items-center">
                           <img 
                             src={item.imageUri} 
                             alt={item.productId?.name}
                             className="w-10 h-10 object-cover rounded mr-3"
                             onError={(e) => {
                               e.target.style.display = 'none';
                               e.target.nextSibling.style.display = 'flex';
                             }}
                           />
                           <div className="w-10 h-10 bg-[#F4F4F4] rounded mr-3 flex items-center justify-center" style={{ display: (item.imageUri || item.productId?.mainImage) ? 'none' : 'flex' }}>
                             <FaBox className="text-[#BDBDBD] text-xs" />
                           </div>
                                                       <div>
                              <div className="font-semibold">{item.productId?.name}</div>
                              <div className="text-sm text-[#4A4A4A]">
                                {item.discountPrice ? (
                                  <>
                                    <span className="line-through text-[#BDBDBD]">{formatBDT(item.price)}</span>
                                    <span className="ml-2 text-green-600 font-medium">{formatBDT(item.discountPrice)}</span>
                                  </>
                                ) : (
                                  <span>{formatBDT(item.price)}</span>
                                )}
                              </div>
                            </div>
                         </div>
                       </td>
                       <td className="py-3 px-4 text-[#4A4A4A]">
                         <div className="flex items-center space-x-3">
                           <div>
                             <div className="font-medium text-[#1B1B1B]">{itemMeasure(item) || '—'}</div>
                             <div className="text-sm text-[#4A4A4A]">
                               {item.color?.name || 'Default Color'}
                             </div>
                             {item.color?.hexCode && (
                               <div className="flex items-center space-x-1 mt-1">
                                 <div 
                                   className="w-3 h-3 rounded-full border border-[#BDBDBD]"
                                   style={{ backgroundColor: item.color.hexCode }}
                                 ></div>
                                 <span className="text-xs text-[#BDBDBD]">{item.color.hexCode}</span>
                               </div>
                             )}
                           </div>
                         </div>
                       </td>
                        <td className="py-3 px-4 text-[#4A4A4A]">
                          <div className="space-y-1.5">
                            <div className="flex gap-2 items-start">
                              <div className="flex-1 min-w-0">
                                <Barcode value={item.barcode || 'NOBARCODE'} className="w-full h-8" />
                                <div className="text-[10px] text-[#4A4A4A] font-mono truncate mt-0.5 text-center font-bold tracking-wider">{item.barcode}</div>
                              </div>
                              <div className="flex-shrink-0">
                                <div 
                                  className="w-11 h-11 bg-white border border-[#BDBDBD] rounded flex items-center justify-center"
                                  dangerouslySetInnerHTML={{ 
                                    __html: generateSVGQRCodeSync(item.qrCode || 'NOQRCODE', 44) 
                                  }}
                                />
                                <div className="text-[10px] text-[#BDBDBD] font-mono truncate text-center mt-0.5">{item.qrCode}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      <td className="py-3 px-4 text-[#4A4A4A]">
                        <div>
                          <div className="font-medium text-[#1B1B1B]">1 Individual Item</div>
                          <div className="text-sm text-[#4A4A4A]">Available: {item.availableQuantity}</div>
                          <div className="text-sm text-[#4A4A4A]">Assigned: {item.assignedQuantity}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1">{item.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#4A4A4A]">
                        <div>
                          <div className="text-sm">{item.location?.warehouse}</div>
                          <div className="text-xs text-[#BDBDBD]">
                            {item.location?.shelf && `Shelf: ${item.location.shelf}`}
                            {item.location?.section && `Section: ${item.location.section}`}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedInventory(item);
                              setFormData({
                                productId: item.productId._id,
                                variantId: item.variantId,
                                size: item.size,
                                stockQuantity: item.stockQuantity,
                                price: item.price || 0,
                                discountPrice: item.discountPrice || 0,
                                manualPricing: true,
                                location: item.location,
                                notes: item.notes
                              });
                              setShowModal(true);
                            }}
                            className="flex items-center bg-[#1B1B1B] text-white px-3 py-1 rounded text-sm hover:bg-[#4A4A4A] transition"
                          >
                            <FaEdit className="mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteInventory(item._id)}
                            className="flex items-center bg-[#B1123B] text-white px-3 py-1 rounded text-sm hover:bg-[#1B1B1B] transition"
                          >
                            <FaTrash className="mr-1" /> Delete
                          </button>
                          {item.status === 'out_of_stock' && (
                            <button
                              onClick={() => {
                                setRestockItem(item);
                                setRestockQuantity(1);
                                setShowRestockModal(true);
                              }}
                              className="flex items-center bg-[#4A4A4A] text-white px-3 py-1 rounded text-sm hover:bg-[#1B1B1B] transition"
                              title="Restock this out-of-stock item"
                            >
                              <FaPlus className="mr-1" /> Restock
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleQRScan(item.qrCode);
                            }}
                            className="flex items-center bg-[#4A4A4A] text-white px-3 py-1 rounded text-sm hover:bg-[#1B1B1B] transition"
                            title="Quick scan this item"
                          >
                            <FaQrcode className="mr-1" /> Quick Scan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              {inventory.map((item) => (
                <div key={item._id} className="bg-[#FAF8F6] border border-[#BDBDBD] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(prev => [...prev, item._id]);
                          } else {
                            setSelectedItems(prev => prev.filter(id => id !== item._id));
                          }
                        }}
                        className="rounded border-[#BDBDBD] text-[#B1123B] focus:ring-[#B1123B] min-w-[44px] min-h-[44px]"
                      />
                      <img 
                        src={item.imageUri} 
                        alt={item.productId?.name}
                        className="w-12 h-12 object-cover rounded ml-2"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="ml-2">
                        <div className="font-semibold text-[#1B1B1B] text-sm">{item.productId?.name}</div>
                        <div className="text-xs text-[#4A4A4A]">{itemMeasure(item)} - {item.color?.name || 'Default Color'}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      <span className="ml-1">{item.status}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-[#BDBDBD]">Price:</span>
                      <span className="ml-1 text-[#1B1B1B] font-medium">
                        {item.discountPrice ? (
                          <>
                            <span className="line-through text-[#BDBDBD]">{formatBDT(item.price)}</span>
                            <span className="ml-1 text-green-600">{formatBDT(item.discountPrice)}</span>
                          </>
                        ) : (
                          <span>{formatBDT(item.price)}</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#BDBDBD]">Stock:</span>
                      <span className="ml-1 text-[#1B1B1B]">Avail: {item.availableQuantity} | Assigned: {item.assignedQuantity}</span>
                    </div>
                    {item.color?.hexCode && (
                      <div className="flex items-center">
                        <span className="text-[#BDBDBD]">Color:</span>
                        <div className="w-3 h-3 rounded-full border border-[#BDBDBD] ml-1" style={{ backgroundColor: item.color.hexCode }}></div>
                        <span className="ml-1 text-[#4A4A4A]">{item.color.hexCode}</span>
                      </div>
                    )}
                    {item.location?.warehouse && (
                      <div>
                        <span className="text-[#BDBDBD]">Location:</span>
                        <span className="ml-1 text-[#4A4A4A]">{item.location.warehouse}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 pt-2 border-t border-[#BDBDBD]">
                    <button
                      onClick={() => {
                        setSelectedInventory(item);
                        setFormData({
                          productId: item.productId._id,
                          variantId: item.variantId,
                          size: item.size,
                          stockQuantity: item.stockQuantity,
                          price: item.price || 0,
                          discountPrice: item.discountPrice || 0,
                          manualPricing: true,
                          location: item.location,
                          notes: item.notes
                        });
                        setShowModal(true);
                      }}
                      className="flex items-center bg-[#1B1B1B] text-white px-3 py-2 rounded text-xs min-h-[44px] min-w-[44px] justify-center"
                    >
                      <FaEdit className="mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteInventory(item._id)}
                      className="flex items-center bg-[#B1123B] text-white px-3 py-2 rounded text-xs min-h-[44px] min-w-[44px] justify-center"
                    >
                      <FaTrash className="mr-1" /> Delete
                    </button>
                    {item.status === 'out_of_stock' && (
                      <button
                        onClick={() => {
                          setRestockItem(item);
                          setRestockQuantity(1);
                          setShowRestockModal(true);
                        }}
                        className="flex items-center bg-[#4A4A4A] text-white px-3 py-2 rounded text-xs min-h-[44px] min-w-[44px] justify-center"
                        title="Restock this out-of-stock item"
                      >
                        <FaPlus className="mr-1" /> Restock
                      </button>
                    )}
                    <button
                      onClick={() => handleQRScan(item.qrCode)}
                      className="flex items-center bg-[#4A4A4A] text-white px-3 py-2 rounded text-xs min-h-[44px] min-w-[44px] justify-center"
                      title="Quick scan this item"
                    >
                      <FaQrcode className="mr-1" /> Scan
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          {pagination.totalPages > 0 && (
            <div className="px-6 py-4 border-t border-[#F4F4F4]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#4A4A4A]">Show</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                    className="px-2 py-1 border border-[#BDBDBD] rounded text-sm text-[#1B1B1B] bg-white"
                  >
                    {[100, 200, 300, 400, 500, 1000].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span className="text-sm text-[#4A4A4A]">
                    {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    {selectedItems.length > 0 && <span className="ml-2 text-[#B1123B] font-medium">({selectedItems.length} selected)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                    disabled={pagination.page === 1}
                    className="px-2 py-1 border border-[#BDBDBD] rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F4F4F4] text-[#1B1B1B]"
                  >
                    {'<<'}
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-[#BDBDBD] rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F4F4F4] text-[#1B1B1B]"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-[#1B1B1B] font-medium px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-[#BDBDBD] rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F4F4F4] text-[#1B1B1B]"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-2 py-1 border border-[#BDBDBD] rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F4F4F4] text-[#1B1B1B]"
                  >
                    {'>>'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#F4F4F4]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1B1B1B]">
                  {selectedInventory ? 'Edit Inventory' : 'Add New Inventory'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedInventory(null);
                    resetForm();
                  }}
                  className="text-[#BDBDBD] hover:text-[#4A4A4A]"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Product</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value, variantId: '', size: '' }))}
                  className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                  disabled={!!selectedInventory}
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="bg-[#F4F4F4] p-4 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={selectedProduct.mainImage} 
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <h3 className="font-semibold text-[#1B1B1B]">{selectedProduct.name}</h3>
                      <p className="text-sm text-[#4A4A4A]">{formatBDT(selectedProduct.mainPrice)}</p>
                      <p className="text-xs text-[#4A4A4A]">{availableVariants.length} variants available</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedProduct && availableVariants.length > 0 && !selectedInventory && (
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={bulkMode}
                      onChange={(e) => setBulkMode(e.target.checked)}
                      className="rounded border-[#BDBDBD] text-[#B1123B] focus:ring-[#B1123B]"
                    />
                    <span className="ml-2 text-sm font-medium text-[#4A4A4A]">
                      Create individual barcodes & QR codes
                    </span>
                  </label>
                                     <div className="text-xs text-[#4A4A4A]">
                     (Each unit gets unique barcode & QR code)
                   </div>
                   {selectedVariants.length > 0 && (
                     <div className="text-xs text-[#B1123B] mt-1">
                       {selectedVariants.length} variant(s) selected
                     </div>
                   )}
                </div>
              )}

                             {selectedProduct && availableVariants.length > 0 && !bulkMode && (
                 <div>
                   <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Variant & Size</label>
                    <select
                     value={formData.variantId}
                     onChange={(e) => {
                       const variant = availableVariants.find(v => v._id === e.target.value);
                       setFormData(prev => ({ 
                         ...prev, 
                         variantId: e.target.value,
                         size: variant?.sizes?.[0] || '',
                         price: variant ? (variant.prices?.[0] || variant.price || 0) : 0,
                         discountPrice: variant ? (variant.discountPrices?.[0] || 0) : 0
                       }));
                     }}
                     className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                     disabled={!!selectedInventory}
                   >
                     <option value="">Select Variant</option>
                     {availableVariants.map((variant) => (
                       <option key={variant._id} value={variant._id}>
                         {variant.colorName || 'Default'} - {variant.sizes?.join(', ') || 'No sizes'} - {formatBDT(variant.prices?.[0] || variant.price || 0)} (Stock: {variant.stock || 0})
                       </option>
                     ))}
                   </select>
                   
                    {formData.variantId && (
                      <div className="mt-3 p-3 bg-[#F4F4F4] rounded-lg">
                        {(() => {
                          const selectedVariant = availableVariants.find(v => v._id === formData.variantId);
                          if (!selectedVariant) return null;
                          const sizeIdx = selectedVariant.sizes?.indexOf(formData.size) ?? -1;
                          const sizePrice = sizeIdx >= 0
                            ? selectedVariant.prices?.[sizeIdx]
                            : selectedVariant.prices?.[0];
                          const sizeDiscount = sizeIdx >= 0
                            ? selectedVariant.discountPrices?.[sizeIdx]
                            : selectedVariant.discountPrices?.[0];
                          const sizeStock = sizeIdx >= 0
                            ? (selectedVariant.stockBySize?.[sizeIdx] ?? selectedVariant.stock)
                            : selectedVariant.stock;
                          return (
                            <div className="flex items-center space-x-3">
                              <div className="w-16 h-16 rounded-lg border-2 border-[#BDBDBD] overflow-hidden flex-shrink-0">
                                {selectedVariant.images && selectedVariant.images.length > 0 ? (
                                  <img 
                                    src={selectedVariant.images[0].url || selectedVariant.images[0]} 
                                    alt={selectedVariant.colorName || 'Variant'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className="w-full h-full bg-[#F4F4F4] flex items-center justify-center" style={{ display: selectedVariant.images && selectedVariant.images.length > 0 ? 'none' : 'flex' }}>
                                  <FaBox className="text-[#BDBDBD]" />
                                </div>
                              </div>
                             
                             <div className="flex-1">
                               <div className="font-medium text-[#1B1B1B]">
                                 {selectedVariant.colorName || 'Default Color'}
                                 {formData.size && (
                                   <span className="ml-2 inline-block bg-[#B1123B] text-white text-xs px-2 py-0.5 rounded">{formData.size}</span>
                                 )}
                               </div>
                               <div className="text-sm text-[#4A4A4A]">
                                 Sizes: {selectedVariant.sizes?.join(', ') || 'No sizes'}
                               </div>
                                                               <div className="text-sm text-[#4A4A4A]">
                                 {formData.size ? `Price (${formData.size}):` : 'Price:'} {formatBDT(sizePrice || 0)}
                                 {sizeDiscount ? (
                                   <span className="ml-2 text-green-600">
                                     (Discounted: {formatBDT(sizeDiscount)})
                                   </span>
                                 ) : null}
                               </div>
                               {typeof sizeStock !== 'undefined' && (
                                 <div className="text-sm text-[#4A4A4A]">Stock: {sizeStock}</div>
                               )}
                               {selectedVariant.hexCode && (
                                 <div className="flex items-center space-x-2 mt-1">
                                   <div 
                                     className="w-4 h-4 rounded-full border border-[#BDBDBD]"
                                     style={{ backgroundColor: selectedVariant.hexCode }}
                                   ></div>
                                   <span className="text-xs text-[#BDBDBD]">{selectedVariant.hexCode}</span>
                                 </div>
                               )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {formData.variantId && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Size</label>
                        <select
                          value={formData.size}
                          onChange={(e) => {
                            const newSize = e.target.value;
                            const variant = availableVariants.find(v => v._id === formData.variantId);
                            const idx = variant?.sizes?.indexOf(newSize) ?? -1;
                            setFormData(prev => ({
                              ...prev,
                              size: newSize,
                              price: idx >= 0
                                ? (variant.prices?.[idx] || variant.prices?.[0] || prev.price)
                                : prev.price,
                              discountPrice: idx >= 0
                                ? (variant.discountPrices?.[idx] || 0)
                                : prev.discountPrice
                            }));
                          }}
                          className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                          disabled={!!selectedInventory}
                        >
                          <option value="">Select Size</option>
                          {(availableVariants.find(v => v._id === formData.variantId)?.sizes || []).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                             {selectedProduct && bulkMode && availableVariants.length > 0 && (
                 <div>
                   <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
                     Select Variants to Create Inventory For
                   </label>
                   <div className="bg-[#F4F4F4] p-4 rounded-lg max-h-60 overflow-y-auto">
                     <div className="space-y-3">
                       {availableVariants.map((variant) => (
                         <div key={variant._id} className="border border-[#BDBDBD] rounded-lg p-3 bg-white">
                                                                                   <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center space-x-3">
                                 <input
                                   type="checkbox"
                                   checked={selectedVariants.includes(variant._id)}
                                   onChange={(e) => {
                                     if (e.target.checked) {
                                       setSelectedVariants(prev => [...prev, variant._id]);
                                     } else {
                                       setSelectedVariants(prev => prev.filter(id => id !== variant._id));
                                     }
                                   }}
                                   className="rounded border-[#BDBDBD] text-[#B1123B] focus:ring-[#B1123B]"
                                 />
                                 <div className="flex-1">
                                  <div className="font-medium text-[#1B1B1B]">
                                    {variant.colorName || 'Default Color'}
                                  </div>
                                  <div className="text-sm text-[#4A4A4A]">
                                    Sizes: {variant.sizes?.join(', ') || 'No sizes'}
                                  </div>
                                  {variant.hexCode && (
                                    <div className="flex items-center space-x-2 mt-1">
                                      <div 
                                        className="w-4 h-4 rounded-full border border-[#BDBDBD]"
                                        style={{ backgroundColor: variant.hexCode }}
                                      ></div>
                                      <span className="text-xs text-[#BDBDBD]">{variant.hexCode}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                             <div className="text-right">
                               <div className="text-sm font-medium text-[#1B1B1B]">
                                 {formatBDT(variant.prices?.[0] || variant.price || 0)}
                               </div>
                               <div className="text-xs text-[#4A4A4A]">
                                 Current Stock: {variant.stock || 0}
                               </div>
                             </div>
                           </div>
                           
                                                       {selectedVariants.includes(variant._id) && (
                              <div className="mt-3 pt-3 border-t border-[#BDBDBD]">
                                <div className="mb-2">
                                  <div className="text-sm font-medium text-[#4A4A4A]">Number of individual barcodes/QR codes to create:</div>
                                  <div className="text-xs text-[#4A4A4A]">Each unit will get a unique barcode and QR code</div>
                                </div>
                                <div className="space-y-3">
                                  {variant.sizes?.map((size, index) => (
                                    <div key={`${variant._id}-${size}`} className="border border-[#BDBDBD] rounded-lg p-3 bg-[#F4F4F4]">
                                      <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-[#4A4A4A]">
                                          Size: {size}
                                        </label>
                                        <div className="text-xs text-[#4A4A4A]">
                                          Price: {formatBDT(variant.prices?.[index] || variant.prices?.[0] || 0)}
                                          {variant.discountPrices?.[index] && (
                                            <span className="ml-2 text-green-600">
                                              (Discounted: {formatBDT(variant.discountPrices[index])})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <label className="text-sm font-medium text-[#4A4A4A] min-w-16">
                                          Quantity:
                                        </label>
                                        <input
                                          type="number"
                                          value={variantStock[variant._id]?.[size] || 0}
                                          onChange={(e) => {
                                            const newValue = parseInt(e.target.value) || 0;
                                            setVariantStock(prev => ({
                                              ...prev,
                                              [variant._id]: {
                                                ...prev[variant._id],
                                                [size]: newValue
                                              }
                                            }));
                                          }}
                                          className="flex-1 px-2 py-1 text-sm border border-[#BDBDBD] rounded focus:outline-none focus:ring-1 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                                          min="0"
                                          placeholder="Quantity"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               )}

                                                           {!bulkMode && (
                 <div>
                   <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
                     Create Individual Item
                   </label>
                   <div className="text-xs text-[#4A4A4A] mb-2">This will create 1 individual item with a unique barcode and QR code</div>
                   <div className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg bg-[#F4F4F4] text-[#4A4A4A]">
                     1 Individual Item (Fixed)
                   </div>
                 </div>
               )}

                {formData.variantId && (
                  <div className="flex items-center space-x-4 mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!formData.manualPricing}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          manualPricing: !e.target.checked,
                          price: e.target.checked ? (availableVariants.find(v => v._id === formData.variantId)?.prices?.[0] || availableVariants.find(v => v._id === formData.variantId)?.price || 0) : prev.price,
                          discountPrice: e.target.checked ? (availableVariants.find(v => v._id === formData.variantId)?.discountPrices?.[0] || 0) : prev.discountPrice
                        }))}
                        className="rounded border-[#BDBDBD] text-[#B1123B] focus:ring-[#B1123B]"
                      />
                      <span className="ml-2 text-sm font-medium text-[#4A4A4A]">
                        Use variant prices (auto-filled)
                      </span>
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
                      Price (BDT) {formData.variantId && !formData.manualPricing && <span className="text-xs text-[#4A4A4A]">(Auto-filled from variant)</span>}
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className={`w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] ${formData.variantId && !formData.manualPricing ? 'bg-[#F4F4F4] text-[#4A4A4A]' : 'bg-white text-[#1B1B1B]'}`}
                      min="0"
                      step="0.01"
                      placeholder={formData.variantId && !formData.manualPricing ? "Auto-filled from variant" : "Enter price"}
                      readOnly={!!formData.variantId && !formData.manualPricing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
                      Discount Price (BDT) {formData.variantId && !formData.manualPricing && <span className="text-xs text-[#4A4A4A]">(Auto-filled from variant)</span>}
                    </label>
                    <input
                      type="number"
                      value={formData.discountPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountPrice: parseFloat(e.target.value) || 0 }))}
                      className={`w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] ${formData.variantId && !formData.manualPricing ? 'bg-[#F4F4F4] text-[#4A4A4A]' : 'bg-white text-[#1B1B1B]'}`}
                      min="0"
                      step="0.01"
                      placeholder={formData.variantId && !formData.manualPricing ? "Auto-filled from variant" : "Enter discount price (optional)"}
                      readOnly={!!formData.variantId && !formData.manualPricing}
                    />
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Warehouse</label>
                                     <input
                     type="text"
                     value={formData.location.warehouse}
                     onChange={(e) => setFormData(prev => ({ 
                       ...prev, 
                       location: { ...prev.location, warehouse: e.target.value }
                     }))}
                     className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                   />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Shelf</label>
                                     <input
                     type="text"
                     value={formData.location.shelf}
                     onChange={(e) => setFormData(prev => ({ 
                       ...prev, 
                       location: { ...prev.location, shelf: e.target.value }
                     }))}
                     className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                   />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Section</label>
                                     <input
                     type="text"
                     value={formData.location.section}
                     onChange={(e) => setFormData(prev => ({ 
                       ...prev, 
                       location: { ...prev.location, section: e.target.value }
                     }))}
                     className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                   />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Notes</label>
                                <textarea
                   value={formData.notes}
                   onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                   rows={3}
                   className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                   placeholder="Add notes about this inventory item..."
                 />
              </div>

              {selectedInventory && (
                <div className="border-t border-[#F4F4F4] pt-4">
                  <h3 className="text-lg font-medium text-[#1B1B1B] mb-3">Generated Codes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Barcode</label>
                      <div className="bg-white p-3 rounded-lg border border-[#BDBDBD]">
                        <Barcode value={selectedInventory.barcode || 'NOBARCODE'} className="w-full h-10" />
                        <div className="text-sm font-mono text-[#1B1B1B] text-center mt-1">{selectedInventory.barcode}</div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#4A4A4A] mb-2">QR Code</label>
                      <div className="bg-[#F4F4F4] p-3 rounded-lg flex items-center space-x-3">
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: generateSVGQRCodeSync(selectedInventory.qrCode, 60) 
                          }}
                        />
                        <div className="text-xs font-mono text-[#4A4A4A]">{selectedInventory.qrCode}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#F4F4F4]">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedInventory(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-[#4A4A4A] bg-[#F4F4F4] rounded-lg hover:bg-[#BDBDBD] transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedInventory ? handleUpdateInventory : handleCreateInventory}
                  className="px-4 py-2 bg-[#B1123B] text-white rounded-lg hover:bg-[#1B1B1B] transition-colors duration-200"
                >
                  {selectedInventory ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#F4F4F4] sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#1B1B1B]">Print Codes</h2>
                  <p className="text-sm text-[#4A4A4A] mt-1">Each selected item represents one unique barcode and QR code</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="px-4 py-2 text-[#4A4A4A] bg-[#F4F4F4] rounded-lg hover:bg-[#BDBDBD] transition-colors duration-200 min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const labels = generatePrintContent();
                      if (labels.length === 0) {
                        toast.warn('Select at least one inventory item to print');
                        return;
                      }
                      const labelHeights = { small: 25, medium: 30, large: 35 };
                      const ok = printSettings.printerType === 'thermal'
                        ? printThermalLabels(labels, { paperWidth: 50, labelHeight: labelHeights[printSettings.labelSize] || 30 })
                        : printDocument(buildA4StickerSheetHTML(labels));
                      if (!ok) toast.error('Print window blocked - please allow popups for this site');
                    }}
                    className="px-4 py-2 bg-[#B1123B] text-white rounded-lg hover:bg-[#1B1B1B] transition-colors duration-200 min-h-[44px]"
                  >
                    <FaPrint className="mr-2" /> Print
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-[#F4F4F4] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-[#1B1B1B]">Print Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Printer Type</label>
                    <select
                      value={printSettings.printerType}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, printerType: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#BDBDBD] rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                    >
                      <option value="normal">Normal Printer</option>
                      <option value="thermal">Thermal Printer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Label Size</label>
                    <select
                      value={printSettings.labelSize}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, labelSize: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#BDBDBD] rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Code Type</label>
                    <select
                      value={printSettings.qrCodeType}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, qrCodeType: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#BDBDBD] rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                    >
                      <option value="qrCode">QR Code Only</option>
                      <option value="barcode">Barcode Only</option>
                      <option value="combined">Both (QR + Barcode)</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={printSettings.showProductInfo}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, showProductInfo: e.target.checked }))}
                      className="rounded border-[#BDBDBD] text-[#B1123B] focus:ring-[#B1123B]"
                    />
                    <label className="ml-2 text-sm font-medium text-[#4A4A4A]">Show Product Info</label>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                                  <button
                  onClick={() => {
                    const newQuantities = {};
                    selectedItems.forEach(itemId => {
                      newQuantities[itemId] = 1;
                    });
                    setPrintQuantities(newQuantities);
                    toast.success('All quantities set to 1 copy each');
                  }}
                  className="px-3 py-1 bg-[#1B1B1B] text-white text-sm rounded hover:bg-[#4A4A4A] transition"
                >
                  Set All to 1 Copy
                </button>
                  <button
                    onClick={() => {
                      setPrintQuantities({});
                      toast.success('All quantities reset');
                    }}
                    className="px-3 py-1 bg-[#4A4A4A] text-white text-sm rounded hover:bg-[#1B1B1B] transition"
                  >
                    Reset All Quantities
                  </button>
                  <button
                    onClick={() => {
                      setPrintSettings(prev => ({ ...prev, qrCodeType: 'qrCode' }));
                      toast.success('Switched to QR Code mode');
                    }}
                    className="px-3 py-1 bg-[#1B1B1B] text-white text-sm rounded hover:bg-[#4A4A4A] transition"
                  >
                    Force QR Code Mode
                  </button>

                  <div className="text-sm text-[#4A4A4A]">
                    Total codes to print: {selectedItems.reduce((sum, itemId) => {
                      const item = inventory.find(inv => inv._id === itemId);
                      const quantity = printQuantities[itemId] || item?.stockQuantity || 0;
                      return sum + quantity;
                    }, 0)}
                  </div>
                  <div className="text-sm text-[#B1123B] font-medium">
                    Current Mode: {printSettings.qrCodeType.toUpperCase()}
                  </div>

                </div>
              </div>

              <div className="text-center mb-6">
                <p className="text-[#4A4A4A]">Generated codes for printing</p>
              </div>
               
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {selectedItems.map((itemId) => {
                  const item = inventory.find(inv => inv._id === itemId);
                  if (!item) return null;
                   
                  return (
                                         <div key={itemId} className="border border-[#BDBDBD] rounded-lg p-4 bg-[#F4F4F4]">
                       <div className="text-center">
                         <div className="mb-3 flex justify-center">
                           <img 
                             src={item.imageUri || item.productId?.mainImage} 
                             alt={item.productId?.name}
                             className="w-16 h-16 object-cover rounded border"
                             onError={(e) => {
                               e.target.style.display = 'none';
                               e.target.nextSibling.style.display = 'flex';
                             }}
                           />
                           <div className="w-16 h-16 bg-[#F4F4F4] rounded border flex items-center justify-center" style={{ display: (item.imageUri || item.productId?.mainImage) ? 'none' : 'flex' }}>
                             <FaBox className="text-[#BDBDBD] text-sm" />
                           </div>
                         </div>
                         
                         <h3 className="font-medium text-sm mb-2 text-[#1B1B1B]">{item.productId?.name}</h3>
                         <p className="text-xs text-[#4A4A4A] mb-1">{itemMeasure(item) || 'No size'}</p>
                         
                                                   <div className="text-xs mb-2">
                             {item.discountPrice ? (
                               <>
                                 <span className="line-through text-[#BDBDBD]">{formatBDT(item.price)}</span>
                                 <span className="ml-1 text-green-600 font-medium">{formatBDT(item.discountPrice)}</span>
                               </>
                             ) : (
                               <span className="text-[#4A4A4A]">{formatBDT(item.price)}</span>
                             )}
                           </div>
                                                 {item.color?.name && (
                           <div className="flex items-center justify-center space-x-2 mb-3">
                             {item.color?.hexCode && (
                               <div 
                                 className="w-4 h-4 rounded-full border border-[#BDBDBD]"
                                 style={{ backgroundColor: item.color.hexCode }}
                               ></div>
                             )}
                             <span className="text-xs text-[#4A4A4A]">{item.color.name}</span>
                           </div>
                         )}
                         
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-[#4A4A4A] mb-1">Copies to Print</label>
                          <input
                            type="number"
                            value={printQuantities[itemId] || 1}
                            onChange={(e) => setPrintQuantities(prev => ({
                              ...prev,
                              [itemId]: parseInt(e.target.value) || 1
                            }))}
                                                         className="w-full px-2 py-1 text-sm border border-[#BDBDBD] rounded focus:outline-none focus:ring-1 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                            min="1"
                            max="50"
                          />
                          <p className="text-xs text-[#4A4A4A] mt-1">Max: 50 copies</p>
                        </div>
                          
                                                <div className="space-y-2">
                          {printSettings.qrCodeType === 'barcode' && (
                            <div>
                              <div className="text-xs font-medium text-[#4A4A4A] mb-1">Barcode</div>
                              <div className="bg-white p-2 rounded border flex items-center justify-center h-16">
                                <Barcode value={item.barcode || 'NOBARCODE'} className="w-full h-full" />
                              </div>
                            </div>
                          )}
                          {printSettings.qrCodeType === 'qrCode' && (
                            <div>
                              <div className="text-xs font-medium text-[#4A4A4A] mb-1">QR Code</div>
                              <div className="bg-white p-2 rounded border flex items-center justify-center">
                                <div 
                                  dangerouslySetInnerHTML={{ 
                                    __html: generateSVGQRCodeSync(item.qrCode || 'NOQRCODE', 60) 
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {printSettings.qrCodeType === 'combined' && (
                            <>
                              <div>
                                <div className="text-xs font-medium text-[#4A4A4A] mb-1">Barcode</div>
                                <div className="bg-white p-2 rounded border flex items-center justify-center h-12">
                                  <Barcode value={item.barcode || 'NOBARCODE'} className="w-full h-full" />
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-[#4A4A4A] mb-1">QR Code</div>
                                <div className="bg-white p-2 rounded border flex items-center justify-center">
                                  <div 
                                    dangerouslySetInnerHTML={{ 
                                      __html: generateSVGQRCodeSync(item.qrCode || 'NOQRCODE', 35) 
                                    }}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-[#1B1B1B]">Print Preview</h3>
                </div>
                <div className="border border-[#BDBDBD] rounded-lg p-4 bg-white">
                  {printSettings.printerType === 'thermal' ? (
                    <div className="space-y-2">
                      {selectedItems.slice(0, 3).map((itemId) => {
                        const item = inventory.find(inv => inv._id === itemId);
                        if (!item) return null;
                        
                        return (
                          <div key={itemId} className="border border-[#BDBDBD] rounded p-3 bg-[#F4F4F4]">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex-1 text-left">
                                <div className="font-bold text-[#1B1B1B]">{item.productId?.name}</div>
                                <div className="text-[#4A4A4A]">{itemMeasure(item) || 'No size'}</div>
                                {item.color?.name && <div className="text-[#4A4A4A]">Color: {item.color.name}</div>}
                                <div className="font-bold text-[#1B1B1B]">
                                  {item.discountPrice ? formatBDT(item.discountPrice) : formatBDT(item.price)}
                                </div>
                              </div>
                                                             <div className="flex-1 text-center flex flex-col items-center justify-center space-y-1">
                                  {printSettings.qrCodeType === 'barcode' && (
                                    <div className="flex items-center justify-center">
                                      <Barcode value={item.barcode || 'NOBARCODE'} className="max-h-8" />
                                    </div>
                                  )}
                                 {printSettings.qrCodeType === 'qrCode' && (
                                   <div className="flex items-center justify-center">
                                                                              <div 
                                           dangerouslySetInnerHTML={{ 
                                             __html: generateSVGQRCodeSync(item.qrCode, 20) 
                                           }}
                                         />
                                   </div>
                                 )}
                                 {printSettings.qrCodeType === 'combined' && (
                                   <div className="flex flex-col items-center justify-center space-y-1">
                                      <div className="flex items-center justify-center">
                                        <Barcode value={item.barcode || 'NOBARCODE'} className="max-h-6" />
                                      </div>
                                      <div className="flex items-center justify-center">
                                       <div 
                                         dangerouslySetInnerHTML={{ 
                                           __html: generateSVGQRCodeSync(item.qrCode, 16) 
                                         }}
                                       />
                                     </div>
                                   </div>
                                 )}
                               </div>
                              <div className="flex-1 text-right">
                                <div className="font-bold text-[#1B1B1B]">{item.barcode}</div>
                                <div className="text-[#4A4A4A]">Qty: 1</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {selectedItems.slice(0, 12).map((itemId) => {
                        const item = inventory.find(inv => inv._id === itemId);
                        if (!item) return null;
                        
                        const quantity = printQuantities[itemId] || item.stockQuantity;
                        
                        return (
                          <div key={itemId} className="border border-[#BDBDBD] rounded p-3 text-center min-h-[120px] flex flex-col justify-between bg-white relative overflow-hidden">
                            <>
                              {printSettings.showProductInfo && (
                                <div className="mb-2">
                                  <div className="text-xs font-semibold text-[#1B1B1B] uppercase tracking-wide">{item.productId?.name}</div>
                                  <div className="text-xs text-[#4A4A4A] bg-[#F4F4F4] px-1 py-0.5 rounded border border-[#BDBDBD] inline-block">{itemMeasure(item) || 'No size'}</div>
                                  {item.color?.name && (
                                    <>
                                      <div className="text-xs text-[#4A4A4A] font-medium">Color: {item.color.name}</div>
                                      <div className="text-xs text-[#4A4A4A] flex items-center justify-center space-x-1">
                                        {item.color?.hexCode && (
                                          <div 
                                            className="w-2.5 h-2.5 rounded-full border border-[#BDBDBD]"
                                            style={{ backgroundColor: item.color.hexCode }}
                                          ></div>
                                        )}
                                        <span className="text-xs text-[#BDBDBD]">{item.color.hexCode}</span>
                                      </div>
                                    </>
                                  )}
                                  <div className="text-xs text-green-600 font-medium mt-1">
                                    {item.discountPrice ? (
                                      <>
                                        <span className="line-through text-[#BDBDBD]">{formatBDT(item.price)}</span>
                                        <span className="ml-1">{formatBDT(item.discountPrice)}</span>
                                      </>
                                    ) : (
                                      <span>{formatBDT(item.price)}</span>
                                    )}
                                  </div>

                                </div>
                              )}

                                                             {printSettings.showQRCode && (
                                 <div className="space-y-2">
                                                                                                       {printSettings.qrCodeType === 'barcode' && (
                                     <div>
                                       <div className="mt-1">
                                             <div 
                                               className="h-10 bg-white border border-[#BDBDBD] rounded flex items-center justify-center p-1"
                                             >
                                                <Barcode value={item.barcode || 'NOBARCODE'} className="w-full h-full" />
                                             </div>
                                        </div>
                                      </div>
                                    )}
                                    {printSettings.qrCodeType === 'qrCode' && (
                                     <div>
                                       <div className="flex items-center space-x-2">
                                         <div className="bg-white p-1 border border-[#BDBDBD] rounded">
                                           <div 
                                             dangerouslySetInnerHTML={{ 
                                               __html: generateSVGQRCodeSync(item.qrCode || 'NOQRCODE', 40) 
                                             }}
                                           />
                                         </div>
                                       </div>
                                     </div>
                                   )}
                                    {printSettings.qrCodeType === 'combined' && (
                                      <div className="space-y-2">
                                        <div>
                                          <div className="mt-1">
                                             <div 
                                               className="h-10 bg-white border border-[#BDBDBD] rounded flex items-center justify-center p-1"
                                             >
                                                <Barcode value={item.barcode || 'NOBARCODE'} className="w-full h-full" />
                                             </div>
                                          </div>
                                        </div>
                                       <div>
                                         <div className="flex items-center justify-center">
                                           <div className="bg-white p-1 border border-[#BDBDBD] rounded">
                                             <div 
                                               dangerouslySetInnerHTML={{ 
                                                 __html: generateSVGQRCodeSync(item.qrCode || 'NOQRCODE', 35) 
                                               }}
                                             />
                                           </div>
                                         </div>
                                       </div>
                                     </div>
                                   )}
                                 </div>
                               )}
                                                             <div className="text-xs text-[#4A4A4A] bg-[#F4F4F4] px-1 py-0.5 rounded border border-[#BDBDBD] mt-1 text-center">{quantity}</div>
                            </>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="text-center mt-3 text-sm text-[#4A4A4A]">
                    Sticker layout - {selectedItems.length} items, 50 per A4 page
                  </div>
                </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F4F4]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#F4F4F4] rounded-lg flex items-center justify-center">
                  <FaCamera className="text-[#B1123B] text-sm" />
                </div>
                <h2 className="font-semibold text-[#1B1B1B]">Enter Code</h2>
              </div>
              <button onClick={() => { setShowScanModal(false); setScannedCode(''); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F4F4] text-[#BDBDBD] hover:text-[#4A4A4A] transition">
                <FaTimes />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {scannedCode && (
                <div className="p-3 bg-[#F7D5DF] border border-[#F7D5DF] rounded-lg text-sm text-[#B1123B]">
                  <strong>Not found:</strong> {scannedCode}
                  <p className="text-xs text-[#B1123B] mt-1">Modify the code below or try scanning a different code.</p>
                </div>
              )}
              <div>
                <input
                  type="text"
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScanCode()}
                  className="w-full px-3 py-2.5 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                  placeholder="Type barcode or QR code..."
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowScanModal(false); setScannedCode(''); }}
                  className="flex-1 px-4 py-2 text-[#4A4A4A] bg-[#F4F4F4] rounded-lg hover:bg-[#BDBDBD] transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScanCode}
                  disabled={!scannedCode.trim()}
                  className="flex-1 px-4 py-2 bg-[#B1123B] text-white rounded-lg hover:bg-[#1B1B1B] disabled:opacity-50 transition text-sm"
                >
                  Find
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRestockModal && restockItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-[#F4F4F4]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1B1B1B]">Restock Inventory</h2>
                <button
                  onClick={() => {
                    setShowRestockModal(false);
                    setRestockItem(null);
                    setRestockQuantity(1);
                  }}
                  className="text-[#BDBDBD] hover:text-[#4A4A4A]"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#F4F4F4] p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  {restockItem.imageUri && (
                    <img 
                      src={restockItem.imageUri} 
                      alt={restockItem.productId?.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-[#1B1B1B]">{restockItem.productId?.name}</h3>
                    <p className="text-sm text-[#4A4A4A]">
                      {itemMeasure(restockItem)} - {restockItem.color?.name || 'Default'}
                    </p>
                    <p className="text-xs text-[#BDBDBD] font-mono">{restockItem.barcode}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
                  Restock Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                />
              </div>

              <div className="bg-maybelline-light border border-maybelline-light rounded-lg p-3">
                <p className="text-sm text-maybelline-magenta">
                  <strong>Currently:</strong> Available {restockItem.availableQuantity} | Assigned {restockItem.assignedQuantity}
                </p>
                <p className="text-sm text-maybelline-magenta font-semibold">
                  <strong>After restock:</strong> Available {restockQuantity} | Assigned 0 — Active
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowRestockModal(false);
                    setRestockItem(null);
                    setRestockQuantity(1);
                  }}
                  className="px-4 py-2 text-[#4A4A4A] bg-[#F4F4F4] rounded-lg hover:bg-[#BDBDBD] transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestock}
                  className="px-4 py-2 bg-maybelline-light0 text-white rounded-lg hover:bg-maybelline-magenta transition-colors duration-200 flex items-center"
                >
                  <FaPlus className="mr-2" /> Restock {restockQuantity} Unit{restockQuantity > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
        title={`${scanMode === 'qr' ? 'QR Code' : 'Barcode'} Scanner`}
        mode={scanMode}
      />
    </div>
  );
};

export default AdminInventory;
