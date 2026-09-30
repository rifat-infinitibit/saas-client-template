// oxlint has no `no-restricted-syntax`, which is how ESLint forbade this.
const noJsxAnd = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'`a && <X />` renders a falsy `a` itself, so a stray 0 reaches the UI.',
		},
	},
	create(context) {
		return {
			'JSXExpressionContainer > LogicalExpression[operator="&&"]'(node) {
				context.report({
					node,
					message:
						'Use a ternary (condition ? <Component /> : null) instead of && in JSX.',
				});
			},
		};
	},
};

export default {
	meta: { name: 'local' },
	rules: { 'no-jsx-and': noJsxAnd },
};
