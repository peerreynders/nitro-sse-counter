module.exports = {
  extends: [
    '.eslintrc.base.cjs',
  ],
	globals: {
		'EventSource': 'readonly',
		'HTMLElement': 'readonly',
		'HTMLParagraphElement': 'readonly',
		'HTMLButtonElement': 'readonly',
		'MessageEvent': 'readonly',
		'Text': 'readonly',
		'console': 'readonly',
		'fetch': 'readonly',
		'self': 'readonly',
	}
};
