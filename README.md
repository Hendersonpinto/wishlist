# Wishlist

An Expo + React Native wishlist application.

The app covers the core user stories>: 
   1. Loading and displaying items
   2. Adding new items
   3. Managing reservations while handling  conflicts
   4. Filtering/sorting the wishlist.

## Demo

**Web:** https://wishlist-onskeskyen.expo.app

The app is primarily designed for iOS and can also be run locally with Expo Go.

---

## Running locally

### Requirements

* Node.js
* Expo Go for iOS device development

### Install

```bash
npm install
```

### Start the Expo development server

```bash
npx expo start
```

Scan the QR code with Expo Go to open the app on an iOS device.

### Run on web

```bash
npx expo start --web
```

---

## Features

* Load and display wishlist items
* Loading state while fetching items
* Error state when loading fails
* Add new wishlist items
* Validate required item name and price
* Optional item URL
* Reserve and unreserve items
* Prevent reservation of items already reserved by another user
* Handle reservation conflicts when another user wins the race condition
* Filter by reservation status
* Filter by price range
* Sort by price, low-to-high or high-to-low
* iOS-oriented UI with glass/blur effects
* Basic accessibility labels and states for interactive controls

---
