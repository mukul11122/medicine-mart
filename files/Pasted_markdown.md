Use the following detailed product requirements prompt to generate a complete medicine e-commerce application similar to 1mg, focused on selling generic medicines under the Pradhan Mantri Bhartiya Janaushadhi Pariyojana.

---

# Prompt

Build a full-stack web and mobile-responsive e-commerce application named **JanAushadhi Store** for selling generic medicines available under the Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP).

The application should have functionality similar to leading online pharmacy apps like Tata 1mg, while complying with Indian pharmacy regulations.

## Core Objectives

1. Allow customers to browse and purchase Jan Aushadhi generic medicines.
2. Allow administrators to manage medicine inventory, pricing, categories, and orders.
3. Provide secure user authentication and order history.
4. Support online payments via UPI and payment gateways.
5. Provide real-time inventory management.
6. Offer medicine search, generic alternatives, and prescription upload functionality.

---

# User Roles

## 1. Customer

### Authentication

* Mobile OTP Login
* Email Login
* Google Login
* Forgot Password
* JWT Authentication
* Session Management

### User Profile

* Name
* Mobile Number
* Email
* Date of Birth
* Gender
* Addresses
* Saved Prescriptions
* Order History
* Wishlist

### Medicine Search

* Search by:

  * Medicine Name
  * Generic Name
  * Salt Composition
  * Category
  * Disease/Condition

### Product Listing

Display:

* Medicine Image
* Medicine Name
* Generic Name
* Composition
* Manufacturer
* Pack Size
* MRP
* Discounted Price
* Availability Status
* Stock Quantity

### Product Detail Page

Show:

* Description
* Dosage Information
* Benefits
* Side Effects
* Generic Alternatives
* Similar Medicines
* Prescription Requirement

### Cart

* Add to Cart
* Remove Item
* Quantity Update
* Save for Later

### Checkout

* Address Selection
* Delivery Charges
* Coupon Application
* Tax Calculation
* Order Summary

### Payments

Integrate:

* UPI
* Google Pay
* PhonePe
* Paytm
* Razorpay
* Cash on Delivery (optional)

Generate:

* Payment Receipt
* Invoice PDF

### Orders

* Place Order
* Track Order
* Cancel Order
* Return Request
* Download Invoice

### Order History

Display:

* Previous Orders
* Reorder Option
* Payment Status
* Prescription History

---

## 2. Admin

### Dashboard

Show:

* Total Sales
* Orders
* Inventory Value
* Revenue
* Active Customers
* Low Stock Alerts

### Medicine Management

CRUD Operations:

* Add Medicine
* Edit Medicine
* Delete Medicine

Medicine Fields:

* SKU
* Medicine Name
* Generic Name
* Composition
* Category
* Subcategory
* Manufacturer
* HSN Code
* MRP
* Selling Price
* GST
* Stock Quantity
* Minimum Stock Level
* Images
* Prescription Required
* Expiry Date
* Batch Number

### Inventory Management

Features:

* Stock In
* Stock Out
* Purchase Entries
* Batch Tracking
* Expiry Tracking
* Auto Low Stock Alerts
* Inventory Reports

### Order Management

* View Orders
* Update Status
* Assign Delivery
* Refund Processing
* Generate Invoice

Order Status:

* Pending
* Confirmed
* Packed
* Shipped
* Delivered
* Cancelled
* Returned

### Customer Management

* View Customers
* Block User
* Purchase History
* Loyalty Points

### Reports

Generate:

* Sales Report
* Inventory Report
* GST Report
* Medicine-wise Sales
* Customer Report

Export:

* PDF
* Excel
* CSV

---

# Prescription Module

Required for prescription medicines.

Features:

* Upload Prescription
* PDF/JPG/PNG Support
* Admin Verification
* Prescription Approval Workflow
* Link Prescription with Order

---

# Payment Integration

Integrate:

* Razorpay
* UPI Intent Flow
* UPI QR Payment
* Google Pay
* PhonePe
* Paytm

Features:

* Payment Success Callback
* Payment Failure Handling
* Refund API
* Transaction Logs

---

# Notifications

### SMS

* OTP
* Order Confirmation
* Delivery Updates

### Email

* Registration
* Invoice
* Order Updates

### Push Notifications

* Offers
* Order Status
* Refill Reminders

---

# Advanced Features

### Medicine Refill Reminder

Notify users when medicines may be running low.

### Generic Substitute Recommendation

Suggest Jan Aushadhi alternatives to branded medicines.

### AI Search

Allow searches such as:

* "Medicine for diabetes"
* "Alternative to Crocin"
* "BP medicines"

### Barcode Scanner

Search medicines using barcode scanning.

### Voice Search

Search medicines using speech.

---

# Technology Stack

### Frontend

* Next.js 15
* React
* TypeScript
* Tailwind CSS
* ShadCN UI

### Mobile

* React Native or Flutter

### Backend

* Node.js
* NestJS
* TypeScript

### Database

* PostgreSQL

### Cache

* Redis

### Storage

* AWS S3

### Authentication

* JWT
* OTP Authentication

### Payments

* Razorpay

### Hosting

* AWS / Azure / DigitalOcean

### APIs

* REST API
* OpenAPI Documentation

---

# Security Requirements

* HTTPS Everywhere
* JWT Authentication
* Role-Based Access Control
* Rate Limiting
* Input Validation
* SQL Injection Protection
* Audit Logs
* Encrypted Password Storage
* Secure Payment Processing
* GDPR and Indian Data Protection Compliance

---

# UI/UX Requirements

Design a modern interface similar to leading pharmacy apps:

* Clean medical theme
* Mobile-first design
* Fast search
* Easy reorder functionality
* Accessibility support
* Dark Mode
* Multi-language support (English + Hindi)

---

# Deliverables

Generate:

1. Complete System Architecture
2. Database Schema
3. API Documentation
4. Admin Dashboard
5. Customer Web App
6. Mobile App
7. Inventory Management Module
8. Razorpay/UPI Payment Integration
9. Authentication System
10. Deployment Guide
11. Docker Setup
12. CI/CD Pipeline
13. Testing Strategy
14. Production-Ready Source Code

The application should be scalable to support **100,000+ medicines, multiple Jan Aushadhi stores, multi-vendor support, and nationwide delivery operations** while maintaining high performance and security.
