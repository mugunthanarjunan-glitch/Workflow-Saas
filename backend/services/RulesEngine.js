/**
 * Rules Engine - evaluates conditions against execution data
 * Supports: ==, !=, >, <, >=, <=, &&, ||, contains(), startsWith(), endsWith()
 */

class RulesEngine {
  /**
   * Evaluate all rules for a step and return the matching next_step_id
   * @param {Array} rules - sorted by priority
   * @param {Object} data - execution input data
   * @returns {{ matchedRule: Object|null, evaluations: Array }}
   */
  static evaluate(rules, data) {
    const evaluations = [];

    for (const rule of rules) {
      if (rule.condition && rule.condition.toUpperCase() === 'DEFAULT') {
        evaluations.push({
          rule_id: rule._id,
          condition: rule.condition,
          result: true,
        });
        return { matchedRule: rule, evaluations };
      }

      const result = RulesEngine.evaluateCondition(rule.condition, data);
      evaluations.push({
        rule_id: rule._id,
        condition: rule.condition,
        result,
      });

      if (result) {
        return { matchedRule: rule, evaluations };
      }
    }

    return { matchedRule: null, evaluations };
  }

  /**
   * Parse and evaluate a condition string against data
   */
  static evaluateCondition(condition, data) {
    try {
      // Split by || first (lower precedence)
      const orParts = RulesEngine.splitByOperator(condition, '||');
      if (orParts.length > 1) {
        return orParts.some((part) => RulesEngine.evaluateCondition(part.trim(), data));
      }

      // Split by && (higher precedence)
      const andParts = RulesEngine.splitByOperator(condition, '&&');
      if (andParts.length > 1) {
        return andParts.every((part) => RulesEngine.evaluateCondition(part.trim(), data));
      }

      // Evaluate single expression
      return RulesEngine.evaluateSingleExpression(condition.trim(), data);
    } catch (error) {
      console.error(`Rule evaluation error for "${condition}":`, error.message);
      return false;
    }
  }

  /**
   * Split a condition string by a logical operator, respecting parentheses and function calls
   */
  static splitByOperator(condition, operator) {
    const parts = [];
    let depth = 0;
    let current = '';

    for (let i = 0; i < condition.length; i++) {
      if (condition[i] === '(') depth++;
      if (condition[i] === ')') depth--;

      if (depth === 0 && condition.substring(i, i + operator.length) === operator) {
        parts.push(current);
        current = '';
        i += operator.length - 1;
      } else {
        current += condition[i];
      }
    }
    parts.push(current);
    return parts;
  }

  /**
   * Evaluate a single comparison or function expression
   */
  static evaluateSingleExpression(expr, data) {
    // Handle string functions: contains(field, value), startsWith(field, value), endsWith(field, value)
    const funcMatch = expr.match(/^(contains|startsWith|endsWith)\s*\(\s*(\w+)\s*,\s*'([^']*)'\s*\)$/);
    if (funcMatch) {
      const [, func, field, value] = funcMatch;
      const fieldValue = String(data[field] || '');
      switch (func) {
        case 'contains': return fieldValue.includes(value);
        case 'startsWith': return fieldValue.startsWith(value);
        case 'endsWith': return fieldValue.endsWith(value);
        default: return false;
      }
    }

    // Handle comparison operators
    const operators = ['>=', '<=', '!=', '==', '>', '<'];
    for (const op of operators) {
      const opIndex = expr.indexOf(op);
      if (opIndex !== -1) {
        const left = expr.substring(0, opIndex).trim();
        const right = expr.substring(opIndex + op.length).trim();

        const leftVal = RulesEngine.resolveValue(left, data);
        const rightVal = RulesEngine.resolveValue(right, data);

        switch (op) {
          case '==': return leftVal == rightVal;
          case '!=': return leftVal != rightVal;
          case '>': return Number(leftVal) > Number(rightVal);
          case '<': return Number(leftVal) < Number(rightVal);
          case '>=': return Number(leftVal) >= Number(rightVal);
          case '<=': return Number(leftVal) <= Number(rightVal);
          default: return false;
        }
      }
    }

    return false;
  }

  /**
   * Resolve a value: if it's a quoted string, strip quotes; if it's a number, parse it; otherwise treat as field name
   */
  static resolveValue(value, data) {
    // Quoted string
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      return value.slice(1, -1);
    }
    // Number
    if (!isNaN(value) && value !== '') {
      return Number(value);
    }
    // Field reference
    return data[value] !== undefined ? data[value] : value;
  }
}

module.exports = RulesEngine;
