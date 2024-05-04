module.exports = {
    presets: [
        'babel-preset-expo',
        '@babel/preset-typescript'
    ],
    plugins: [
        [
            'module-resolver',
            {
                root: ['.'],
                alias: {
                    '@': '.'
                }
            }
        ]
    ],
    comments: false
};