'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _this = this;

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactNative = require('react-native');

var _reactNativePickerPicker = require('@react-native-picker/picker');

var _reactNativeAsyncStorageAsyncStorage = require('@react-native-async-storage/async-storage');

var _reactNativeAsyncStorageAsyncStorage2 = _interopRequireDefault(_reactNativeAsyncStorageAsyncStorage);

var _expoVectorIcons = require('@expo/vector-icons');

var STORAGE_KEY = 'expenses';

var expenseOptions = ['Food', 'Housing', 'Transport', 'Entertainment', 'Utilities', 'Fuel', 'Groceries', 'Education', 'Learning', 'Rent', 'Internet', 'Mobile Recharge', 'Tea and/or Coffee', 'Other'];
var incomeOptions = ['Salary', 'Freelancing', 'Gift', 'Investment', 'Other'];
var borrowingOptions = ['Friend', 'Family', 'Bank Loan', 'Credit Card', 'Other'];

var AddData = function AddData() {
    var _ref = _react.useState < 'entry' | 'budget' > 'entry';

    var _ref2 = _slicedToArray(_ref, 2);

    var selectedView = _ref2[0];
    var setSelectedView = _ref2[1];

    var _useState = (0, _react.useState)('--Select--');

    var _useState2 = _slicedToArray(_useState, 2);

    var type = _useState2[0];
    var setType = _useState2[1];

    var _useState3 = (0, _react.useState)('');

    var _useState32 = _slicedToArray(_useState3, 2);

    var amount = _useState32[0];
    var setAmount = _useState32[1];

    var _useState4 = (0, _react.useState)('--Select--');

    var _useState42 = _slicedToArray(_useState4, 2);

    var nature = _useState42[0];
    var setNature = _useState42[1];

    var _useState5 = (0, _react.useState)('');

    var _useState52 = _slicedToArray(_useState5, 2);

    var otherNature = _useState52[0];
    var setOtherNature = _useState52[1];

    var _useState6 = (0, _react.useState)(false);

    var _useState62 = _slicedToArray(_useState6, 2);

    var showOtherInput = _useState62[0];
    var setShowOtherInput = _useState62[1];

    var _ref3 = _react.useState < BudgetMap > {};

    var _ref32 = _slicedToArray(_ref3, 2);

    var expenseNatureBudget = _ref32[0];
    var setExpenseNatureBudget = _ref32[1];

    var _ref4 = _react.useState < BudgetMap > {};

    var _ref42 = _slicedToArray(_ref4, 2);

    var borrowingNatureLimit = _ref42[0];
    var setBorrowingNatureLimit = _ref42[1];

    var _useState7 = (0, _react.useState)(false);

    var _useState72 = _slicedToArray(_useState7, 2);

    var isBudgetEditing = _useState72[0];
    var setIsBudgetEditing = _useState72[1];

    var _useState8 = (0, _react.useState)('');

    var _useState82 = _slicedToArray(_useState8, 2);

    var editingBudgetType = _useState82[0];
    var setEditingBudgetType = _useState82[1];

    var _useState9 = (0, _react.useState)('');

    var _useState92 = _slicedToArray(_useState9, 2);

    var editingBudgetNature = _useState92[0];
    var setEditingBudgetNature = _useState92[1];

    var _useState10 = (0, _react.useState)('');

    var _useState102 = _slicedToArray(_useState10, 2);

    var tempBudgetAmount = _useState102[0];
    var setTempBudgetAmount = _useState102[1];

    var currentColorScheme = (0, _reactNative.useColorScheme)();

    var _useState11 = (0, _react.useState)(false);

    var _useState112 = _slicedToArray(_useState11, 2);

    var mounted = _useState112[0];
    var setMounted = _useState112[1];

    var theme = {
        background: currentColorScheme === 'dark' ? '#121212' : '#f5f5f5',
        box: currentColorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
        text: currentColorScheme === 'dark' ? '#ffffff' : '#000000',
        textSecondary: currentColorScheme === 'dark' ? '#b0b0b0' : '#666666',
        separator: currentColorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
        primary: '#007AFF',
        destructive: '#FF3B30',
        income: currentColorScheme === 'dark' ? '#30D158' : '#34C759',
        expense: currentColorScheme === 'dark' ? '#FF453A' : '#FF3B30',
        borrowing: currentColorScheme === 'dark' ? '#FF9F0A' : '#FF9500',
        inputBg: currentColorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0',
        inputBorder: currentColorScheme === 'dark' ? '#444' : '#d1d1d6',
        placeholder: currentColorScheme === 'dark' ? '#888' : '#999',
        segmentActive: currentColorScheme === 'dark' ? '#636366' : '#ffffff',
        segmentInactive: 'transparent',
        segmentTextActive: currentColorScheme === 'dark' ? '#ffffff' : '#000000',
        segmentTextInactive: currentColorScheme === 'dark' ? '#e5e5e5' : '#007AFF' };

    var getNatureOptions = function getNatureOptions(selectedType) {
        if (selectedType === 'Expense') return expenseOptions;
        if (selectedType === 'Income') return incomeOptions;
        if (selectedType === 'Borrowing') return borrowingOptions;
        return [];
    };

    var getButtonColor = function getButtonColor() {
        switch (type) {
            case 'Income':
                return theme.income;
            case 'Expense':
                return theme.expense;
            case 'Borrowing':
                return theme.borrowing;
            default:
                return theme.primary;}
    };

    (0, _react.useEffect)(function () {
        setMounted(true);
        var loadBudgets = function loadBudgets() {
            var storedExpenseNatureBudget, storedBorrowingNatureLimit;
            return regeneratorRuntime.async(function loadBudgets$(context$3$0) {
                while (1) switch (context$3$0.prev = context$3$0.next) {
                    case 0:
                        context$3$0.prev = 0;
                        context$3$0.next = 3;
                        return regeneratorRuntime.awrap(_reactNativeAsyncStorageAsyncStorage2['default'].getItem('expenseNatureBudget'));

                    case 3:
                        storedExpenseNatureBudget = context$3$0.sent;
                        context$3$0.next = 6;
                        return regeneratorRuntime.awrap(_reactNativeAsyncStorageAsyncStorage2['default'].getItem('borrowingNatureLimit'));

                    case 6:
                        storedBorrowingNatureLimit = context$3$0.sent;

                        if (mounted && storedExpenseNatureBudget) {
                            setExpenseNatureBudget(JSON.parse(storedExpenseNatureBudget) || {});
                        }
                        if (mounted && storedBorrowingNatureLimit) {
                            setBorrowingNatureLimit(JSON.parse(storedBorrowingNatureLimit) || {});
                        }
                        context$3$0.next = 15;
                        break;

                    case 11:
                        context$3$0.prev = 11;
                        context$3$0.t0 = context$3$0['catch'](0);

                        console.error('Failed to load budget values', context$3$0.t0);
                        _reactNative.Alert.alert("Load Error", "Could not load saved budget data.");

                    case 15:
                    case 'end':
                        return context$3$0.stop();
                }
            }, null, _this, [[0, 11]]);
        };
        loadBudgets();

        return function () {
            setMounted(false);
        };
    }, []);
    (0, _react.useEffect)(function () {
        var saveBudgets = function saveBudgets() {
            return regeneratorRuntime.async(function saveBudgets$(context$3$0) {
                while (1) switch (context$3$0.prev = context$3$0.next) {
                    case 0:
                        if (!(!mounted || isBudgetEditing)) {
                            context$3$0.next = 2;
                            break;
                        }

                        return context$3$0.abrupt('return');

                    case 2:
                        context$3$0.prev = 2;
                        context$3$0.next = 5;
                        return regeneratorRuntime.awrap(_reactNativeAsyncStorageAsyncStorage2['default'].setItem('expenseNatureBudget', JSON.stringify(expenseNatureBudget)));

                    case 5:
                        context$3$0.next = 7;
                        return regeneratorRuntime.awrap(_reactNativeAsyncStorageAsyncStorage2['default'].setItem('borrowingNatureLimit', JSON.stringify(borrowingNatureLimit)));

                    case 7:
                        context$3$0.next = 12;
                        break;

                    case 9:
                        context$3$0.prev = 9;
                        context$3$0.t0 = context$3$0['catch'](2);

                        console.error("Failed to auto-save budgets", context$3$0.t0);

                    case 12:
                    case 'end':
                        return context$3$0.stop();
                }
            }, null, _this, [[2, 9]]);
        };

        if (mounted && !isBudgetEditing) {
            saveBudgets();
        }
    }, [expenseNatureBudget, borrowingNatureLimit, isBudgetEditing, mounted]);

    var saveData = function saveData() {
        var finalNature, parsedAmount, record, existing, parsed, dataToSave;
        return regeneratorRuntime.async(function saveData$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
                case 0:
                    finalNature = showOtherInput ? otherNature.trim() : nature;

                    if (!(type === '--Select--' || nature === '--Select--' || !amount)) {
                        context$2$0.next = 4;
                        break;
                    }

                    _reactNative.Alert.alert('Missing Information', 'Please select a type, category, and enter an amount.');
                    return context$2$0.abrupt('return');

                case 4:
                    if (!(showOtherInput && !finalNature)) {
                        context$2$0.next = 7;
                        break;
                    }

                    _reactNative.Alert.alert('Missing Information', 'Please enter the custom category.');
                    return context$2$0.abrupt('return');

                case 7:
                    parsedAmount = parseFloat(amount);

                    if (!(isNaN(parsedAmount) || parsedAmount <= 0)) {
                        context$2$0.next = 11;
                        break;
                    }

                    _reactNative.Alert.alert('Invalid Input', 'Please enter a valid positive amount.');
                    return context$2$0.abrupt('return');

                case 11:
                    record = {
                        amount: parsedAmount,
                        nature: finalNature,
                        type: type,
                        date: new Date().toISOString(),
                        id: Date.now().toString() };
                    context$2$0.prev = 12;
                    context$2$0.next = 15;
                    return regeneratorRuntime.awrap(_reactNativeAsyncStorageAsyncStorage2['default'].getItem(STORAGE_KEY));

                case 15:
                    existing = context$2$0.sent;
                    parsed = existing ? JSON.parse(existing) : [];
                    dataToSave = Array.isArray(parsed) ? parsed : [];

                    dataToSave.push(record);

                    context$2$0.next = 21;
                    return regeneratorRuntime.awrap(_reactNativeAsyncStorageAsyncStorage2['default'].setItem(STORAGE_KEY, JSON.stringify(dataToSave)));

                case 21:
                    _reactNative.Alert.alert('Success', type + ' entry saved successfully!');

                    setAmount('');
                    setNature('--Select--');
                    setOtherNature('');
                    setShowOtherInput(false);
                    setType('--Select--');context$2$0.next = 33;
                    break;

                case 29:
                    context$2$0.prev = 29;
                    context$2$0.t0 = context$2$0['catch'](12);

                    console.error('AsyncStorage error:', context$2$0.t0);
                    _reactNative.Alert.alert('Error', 'Failed to save data. Please try again.');

                case 33:
                case 'end':
                    return context$2$0.stop();
            }
        }, null, _this, [[12, 29]]);
    };

    var handleSetBudget = function handleSetBudget() {
        if (!editingBudgetType || !editingBudgetNature || !tempBudgetAmount) {
            _reactNative.Alert.alert('Missing Information', 'Please select a budget type, category, and enter an amount.');
            return;
        }

        var parsedAmount = parseFloat(tempBudgetAmount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            _reactNative.Alert.alert('Invalid Input', 'Budget amount must be a valid non-negative number.');
            return;
        }

        if (editingBudgetType === 'Expense') {
            setExpenseNatureBudget(function (prev) {
                return _extends({}, prev, _defineProperty({}, editingBudgetNature, parsedAmount));
            });
        } else if (editingBudgetType === 'Borrowing') {
                setBorrowingNatureLimit(function (prev) {
                    return _extends({}, prev, _defineProperty({}, editingBudgetNature, parsedAmount));
                });
            }

        setTempBudgetAmount('');

        setIsBudgetEditing(false);
        _reactNative.Alert.alert('Budget Set', 'Budget for ' + editingBudgetNature + ' (' + editingBudgetType + ') set to ' + parsedAmount + '.');
    };

    var renderBudgetInputs = function renderBudgetInputs() {
        var options = editingBudgetType === 'Expense' ? expenseOptions : borrowingOptions;
        var budgetMap = editingBudgetType === 'Expense' ? expenseNatureBudget : borrowingNatureLimit;

        return _react2['default'].createElement(
            _react.Fragment,
            null,
            _react2['default'].createElement(
                _reactNative.Text,
                { style: [styles.label, { color: theme.textSecondary, marginTop: 15 }] },
                'Category'
            ),
            _react2['default'].createElement(
                _reactNative.View,
                { style: [styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }] },
                _react2['default'].createElement(
                    _reactNativePickerPicker.Picker,
                    {
                        selectedValue: editingBudgetNature,
                        onValueChange: setEditingBudgetNature,
                        dropdownIconColor: theme.textSecondary,
                        style: [styles.pickerStyle, { color: theme.text }],
                        prompt: 'Select ' + editingBudgetType + 'Category' },
                    _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { label: '-- Select category --', value: '', color: theme.placeholder }),
                    options.filter(function (opt) {
                        return opt !== 'Other';
                    }).map(function (option) {
                        return _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { key: option, label: option + ' (Current: ' + (budgetMap[option] !== undefined ? budgetMap[option] : 'Not Set') + ')', value: option, color: theme.text });
                    })
                )
            ),
            _react2['default'].createElement(
                _reactNative.Text,
                { style: [styles.label, { color: theme.textSecondary }] },
                'Budget Amount'
            ),
            _react2['default'].createElement(_reactNative.TextInput, {
                style: [styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }],
                keyboardType: 'numeric',
                value: tempBudgetAmount,
                onChangeText: setTempBudgetAmount,
                placeholder: 'Enter new budget for ' + (editingBudgetNature || 'selected category'),
                placeholderTextColor: theme.placeholder,
                returnKeyType: 'done'
            }),
            _react2['default'].createElement(
                _reactNative.TouchableOpacity,
                {
                    onPress: handleSetBudget,
                    disabled: !editingBudgetNature || !tempBudgetAmount,
                    style: [styles.button, { backgroundColor: theme.primary, marginTop: 5 }, (!editingBudgetNature || !tempBudgetAmount) && styles.buttonDisabled]
                },
                _react2['default'].createElement(_expoVectorIcons.Ionicons, { name: 'checkmark-circle-outline', size: 20, color: 'white', style: { marginRight: 8 } }),
                _react2['default'].createElement(
                    _reactNative.Text,
                    { style: styles.buttonText },
                    'Set Budget'
                )
            )
        );
    };

    return _react2['default'].createElement(
        _reactNative.KeyboardAvoidingView,
        {
            behavior: _reactNative.Platform.OS === "ios" ? "padding" : "height",
            style: { flex: 1 }
        },
        _react2['default'].createElement(
            _reactNative.ScrollView,
            {
                style: [styles.container, { backgroundColor: theme.background }],
                contentContainerStyle: styles.scrollContentContainer,
                keyboardShouldPersistTaps: 'handled' },
            _react2['default'].createElement(
                _reactNative.View,
                { style: styles.segmentContainer },
                _react2['default'].createElement(
                    _reactNative.TouchableOpacity,
                    {
                        style: [styles.segmentButton, selectedView === 'entry' && { backgroundColor: theme.segmentActive }],
                        onPress: function () {
                            return setSelectedView('entry');
                        }
                    },
                    _react2['default'].createElement(_expoVectorIcons.Ionicons, { name: 'add-circle-outline', size: 20, color: selectedView === 'entry' ? theme.segmentTextActive : theme.segmentTextInactive, style: { marginRight: 5 } }),
                    _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.segmentText, { color: selectedView === 'entry' ? theme.segmentTextActive : theme.segmentTextInactive }] },
                        'Add Entry'
                    )
                ),
                _react2['default'].createElement(
                    _reactNative.TouchableOpacity,
                    {
                        style: [styles.segmentButton, selectedView === 'budget' && { backgroundColor: theme.segmentActive }],
                        onPress: function () {
                            return setSelectedView('budget');
                        }
                    },
                    _react2['default'].createElement(_expoVectorIcons.Ionicons, { name: 'options-outline', size: 20, color: selectedView === 'budget' ? theme.segmentTextActive : theme.segmentTextInactive, style: { marginRight: 5 } }),
                    _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.segmentText, { color: selectedView === 'budget' ? theme.segmentTextActive : theme.segmentTextInactive }] },
                        'Manage Budgets'
                    )
                )
            ),
            selectedView === 'entry' && _react2['default'].createElement(
                _reactNative.View,
                { style: [styles.sectionContainer, { backgroundColor: theme.box }] },
                _react2['default'].createElement(
                    _reactNative.Text,
                    { style: [styles.sectionTitle, { color: theme.text }] },
                    'New Transaction'
                ),
                _react2['default'].createElement(
                    _reactNative.Text,
                    { style: [styles.label, { color: theme.textSecondary }] },
                    'Type'
                ),
                _react2['default'].createElement(
                    _reactNative.View,
                    { style: [styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }] },
                    _react2['default'].createElement(
                        _reactNativePickerPicker.Picker,
                        {
                            selectedValue: type,
                            onValueChange: function (val) {
                                setType(val);
                                setNature('--Select--');
                                setShowOtherInput(false);
                                setOtherNature('');
                            },
                            dropdownIconColor: theme.textSecondary,
                            style: [styles.pickerStyle, { color: theme.text }],
                            prompt: 'Select Transaction Type' },
                        _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { label: '-- Select Type --', value: '--Select--', color: theme.placeholder }),
                        _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { label: 'Expense', value: 'Expense', color: theme.text }),
                        _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { label: 'Income', value: 'Income', color: theme.text }),
                        _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { label: 'Borrowing', value: 'Borrowing', color: theme.text })
                    )
                ),
                _react2['default'].createElement(
                    _reactNative.Text,
                    { style: [styles.label, { color: theme.textSecondary }] },
                    'Amount'
                ),
                _react2['default'].createElement(_reactNative.TextInput, {
                    style: [styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }],
                    keyboardType: 'numeric',
                    value: amount,
                    onChangeText: setAmount,
                    placeholder: 'Enter amount (e.g., 50.00)',
                    placeholderTextColor: theme.placeholder,
                    returnKeyType: 'next' }),
                _react2['default'].createElement(
                    _reactNative.Text,
                    { style: [styles.label, { color: theme.textSecondary }] },
                    type === '--Select--' ? 'category' : 'category of ' + type
                ),
                _react2['default'].createElement(
                    _reactNative.View,
                    { style: [styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }] },
                    _react2['default'].createElement(
                        _reactNativePickerPicker.Picker,
                        {
                            selectedValue: nature,
                            onValueChange: function (val) {
                                setNature(val);
                                setShowOtherInput(val === 'Other');
                                setOtherNature('');
                            },
                            enabled: type !== '--Select--',
                            dropdownIconColor: theme.textSecondary,
                            style: [styles.pickerStyle, { color: type === '--Select--' ? theme.placeholder : theme.text }],
                            prompt: 'Select category of ' + type },
                        _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { label: '-- Select category --', value: '--Select--', color: theme.placeholder }),
                        getNatureOptions(type).map(function (option) {
                            return _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { key: option, label: option, value: option, color: theme.text });
                        })
                    )
                ),
                showOtherInput && _react2['default'].createElement(
                    _react.Fragment,
                    null,
                    _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.label, { color: theme.textSecondary }] },
                        'Custom category'
                    ),
                    _react2['default'].createElement(_reactNative.TextInput, {
                        style: [styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }],
                        value: otherNature,
                        onChangeText: setOtherNature,
                        placeholder: 'Enter custom ' + type.toLowerCase() + ' nature',
                        placeholderTextColor: theme.placeholder,
                        returnKeyType: 'done'
                    })
                ),
                _react2['default'].createElement(
                    _reactNative.TouchableOpacity,
                    {
                        onPress: saveData,
                        style: [styles.button, { backgroundColor: getButtonColor() }],
                        disabled: type === '--Select--' },
                    _react2['default'].createElement(_expoVectorIcons.Ionicons, {
                        name: type === 'Expense' ? 'arrow-down-circle' : type === 'Income' ? 'arrow-up-circle' : type === 'Borrowing' ? 'download' : 'save',
                        size: 20,
                        color: type === '--Select--' ? theme.placeholder : "white",
                        style: { marginRight: 8 }
                    }),
                    _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.buttonText, type === '--Select--' && { color: theme.placeholder }] },
                        type === '--Select--' ? 'Save Entry' : 'Save ' + type
                    )
                )
            ),
            selectedView === 'budget' && _react2['default'].createElement(
                _reactNative.View,
                { style: [styles.sectionContainer, { backgroundColor: theme.box }] },
                _react2['default'].createElement(
                    _reactNative.Text,
                    { style: [styles.sectionTitle, { color: theme.text }] },
                    'Manage Budgets'
                ),
                _react2['default'].createElement(
                    _reactNative.View,
                    { style: styles.budgetDisplayContainer },
                    _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.budgetCategoryTitle, { color: theme.text }] },
                        'Expense Budgets'
                    ),
                    Object.keys(expenseNatureBudget).length === 0 ? _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.budgetText, { color: theme.textSecondary, fontStyle: 'italic' }] },
                        'No expense budgets set.'
                    ) : Object.entries(expenseNatureBudget).map(function (_ref5) {
                        var _ref52 = _slicedToArray(_ref5, 2);

                        var nature = _ref52[0];
                        var budget = _ref52[1];
                        return _react2['default'].createElement(
                            _reactNative.Text,
                            { key: 'exp-' + nature, style: [styles.budgetText, { color: theme.text }] },
                            '• ',
                            nature,
                            ': ',
                            _react2['default'].createElement(
                                _reactNative.Text,
                                { style: { fontWeight: 'bold' } },
                                String(budget)
                            )
                        );
                    }),
                    _react2['default'].createElement(_reactNative.View, { style: [styles.separator, { backgroundColor: theme.separator, marginVertical: 15 }] }),
                    _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.budgetCategoryTitle, { color: theme.text }] },
                        'Borrowing Limits'
                    ),
                    Object.keys(borrowingNatureLimit).length === 0 ? _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.budgetText, { color: theme.textSecondary, fontStyle: 'italic' }] },
                        'No borrowing limits set.'
                    ) : Object.entries(borrowingNatureLimit).map(function (_ref6) {
                        var _ref62 = _slicedToArray(_ref6, 2);

                        var nature = _ref62[0];
                        var limit = _ref62[1];
                        return _react2['default'].createElement(
                            _reactNative.Text,
                            { key: 'bor-' + nature, style: [styles.budgetText, { color: theme.text }] },
                            '• ',
                            nature,
                            ': ',
                            _react2['default'].createElement(
                                _reactNative.Text,
                                { style: { fontWeight: 'bold' } },
                                String(limit)
                            )
                        );
                    })
                ),
                _react2['default'].createElement(_reactNative.View, { style: [styles.separator, { backgroundColor: theme.separator, marginVertical: 15 }] }),
                !isBudgetEditing ? _react2['default'].createElement(
                    _reactNative.TouchableOpacity,
                    {
                        onPress: function () {
                            setIsBudgetEditing(true);
                            setEditingBudgetType('');
                            setEditingBudgetNature('');
                            setTempBudgetAmount('');
                        },
                        style: [styles.button, { backgroundColor: theme.primary, marginTop: 0 }]
                    },
                    _react2['default'].createElement(_expoVectorIcons.Ionicons, { name: 'create-outline', size: 20, color: 'white', style: { marginRight: 8 } }),
                    _react2['default'].createElement(
                        _reactNative.Text,
                        { style: styles.buttonText },
                        'Edit Budgets'
                    )
                ) : _react2['default'].createElement(
                    _reactNative.View,
                    null,
                    _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.sectionTitle, { color: theme.text, paddingTop: 0, paddingBottom: 5 }] },
                        'Edit Budget'
                    ),
                    _react2['default'].createElement(
                        _reactNative.Text,
                        { style: [styles.label, { color: theme.textSecondary }] },
                        'Budget Type'
                    ),
                    _react2['default'].createElement(
                        _reactNative.View,
                        { style: [styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }] },
                        _react2['default'].createElement(
                            _reactNativePickerPicker.Picker,
                            {
                                selectedValue: editingBudgetType,
                                onValueChange: function (val) {
                                    setEditingBudgetType(val);
                                    setEditingBudgetNature('');
                                    setTempBudgetAmount('');
                                },
                                dropdownIconColor: theme.textSecondary,
                                style: [styles.pickerStyle, { color: theme.text }],
                                prompt: 'Select Budget Type to Edit'
                            },
                            _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { label: '-- Select Type --', value: '', color: theme.placeholder }),
                            _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { label: 'Expense', value: 'Expense', color: theme.text }),
                            _react2['default'].createElement(_reactNativePickerPicker.Picker.Item, { label: 'Borrowing', value: 'Borrowing', color: theme.text })
                        )
                    ),
                    editingBudgetType ? renderBudgetInputs() : null,
                    _react2['default'].createElement(
                        _reactNative.TouchableOpacity,
                        {
                            onPress: function () {
                                return setIsBudgetEditing(false);
                            },
                            style: [styles.button, { backgroundColor: theme.textSecondary, marginTop: 10 }]
                        },
                        _react2['default'].createElement(_expoVectorIcons.Ionicons, { name: 'close-circle-outline', size: 20, color: 'white', style: { marginRight: 8 } }),
                        _react2['default'].createElement(
                            _reactNative.Text,
                            { style: styles.buttonText },
                            'Cancel Editing'
                        )
                    )
                )
            )
        )
    );
};

var styles = _reactNative.StyleSheet.create({
    container: {
        flex: 1
    },
    scrollContentContainer: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 40
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: _reactNative.Platform.OS === 'ios' ? '#7676801F' : '#e0e0e0',
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden'
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row' },
    segmentText: {
        fontSize: 14,
        fontWeight: '600'
    },
    sectionContainer: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6
    },
    input: {
        height: 56,
        borderWidth: 1,
        marginBottom: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        fontSize: 16
    },
    pickerContainer: {
        height: 54,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 16,
        justifyContent: 'center',
        overflow: 'hidden'
    },
    pickerStyle: {
        height: '100%',
        width: '100%'
    },
    button: {
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        minHeight: 48
    },
    buttonDisabled: {
        opacity: 0.5
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16
    },
    budgetDisplayContainer: {
        marginBottom: 15
    },
    budgetCategoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8
    },
    budgetText: {
        fontSize: 15,
        marginBottom: 4,
        marginLeft: 10
    },
    separator: {
        height: _reactNative.StyleSheet.hairlineWidth
    }
});

exports['default'] = AddData;
module.exports = exports['default'];