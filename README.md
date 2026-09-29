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


## Decisions

### Keep state local

I decided not to use a state management library or a cache layer such as Redux, Zustand, or TanStack Query.

The application is small and has one main screen, so keeping the state in React makes the code easier to follow.

In a real application, I would use these types of tools in most projects.


### Handle stale client state

The API can change the wishlist without the current user knowing about it. For example, another user can reserve an item while the current user is looking at the list.

This can leave the UI with **stale client state**.

For a real application, I would consider real-time server events using WebSockets or a similar solution.



## What I'd do with more time

### 1. Improve the code structure

The current implementation is kept in one file to keep the case easy to run and review.

In a real project, I would split it into smaller files with clear responsibilities.

This would make the code easier to read, test, document, and maintain.

### 2. Separate UI from logic

I would separate presentational components from components that contain more business logic.

For example, a wishlist item should mainly be responsible for displaying the item and handling UI interactions, while reservation and API logic could live in a hook 

### 3. Create reusable hooks

I would move the main wishlist logic into a reusable hook.

For example:

```text
useWishlist()
```

could handle:

* Loading items
* Adding items
* Reserving items
* Unreserving items
* Handling conflicts
* Loading and error states


### 4. Improve form validation

I would use Zod for form validation.

I would also show validation errors next to the relevant fields instead of using one general error message.

### 5. Automated tests

I would add automated tests around the important user flows and state transitions rather than testing every small UI detail.

For unit and integration tests, I would cover cases such as:

* Loading the wishlist successfully
* Handling an API failure when loading
* Adding a valid item
* Rejecting invalid form input
* Handling an error when adding an item
* Reserving an available item
* Unreserving an item
* Preventing duplicate reservation requests
* Handling a reservation conflict
* Updating the UI with the item returned from a conflict
* Handling reservation failures
* Filtering by reservation status
* Filtering by price
* Sorting by price

I would also add tests for the most important edge cases, such as two reservation requests happening at nearly the same time.

For the UI, I would focus on testing **user behavior and outcomes** rather than implementation details. For example, I would test that after a reservation conflict the user sees the correct message and the item reflects the server state, rather than testing the internal state variables directly.

Finally, I would add an end-to-end test for the main flows


### 6. CI/CD

I would add a small CI/CD pipeline using GitHub Actions.

On every pull request, the pipeline would run the checks needed to make sure the code is safe to merge, for example:

* TypeScript type checking
* Linting
* Automated tests
* Production web export/build

### 7. Performance

If the wishlist could grow to thousands of items, I would consider loading more items only when needed.

For example, the API could support pagination and the UI could use infinite scrolling to load more items as the user reaches the bottom of the list.

I would not add this for the current case because the provided API returns the whole list and the dataset is small.

### 8. Accessibility testing

I added accessibility labels and states to the main interactive elements.

With more time, I would add more formal accessibility testing.

For example:

Test the main flows with a screen reader
Check focus and interaction behavior in modals and sheets
Add automated accessibility checks where possible
Run accessibility validation as part of CI/CD

For the web version, I would also consider running tools such as axe in CI to catch common accessibility issues before deployment.

### 9. Product improvements

There are also a few product ideas I would explore beyond the technical requirements.

Better empty states

Instead of only showing that the wishlist is empty, the empty state could explain what to do next and suggest adding popular or example items.

Item priority

The owner could mark or rank items based on how much they actually want them. This could help people choosing what to buy.

Anonymous reservations

An option to reserve an item anonymously could allow someone to buy a gift without the wishlist owner knowing who reserved it.

This would make it possible to keep the surprise while still preventing multiple people from buying the same item.

---

