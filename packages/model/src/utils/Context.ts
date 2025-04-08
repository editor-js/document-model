// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ContextStack: any[] = [];

/**
 * Puts context value to the context stack so function is able to retrieve it
 *
 * @param context - context value
 * @param fn - function to call
 */
export function runWithContext<T, C = unknown>(context: C, fn: () => T): T {
  ContextStack.push(context);

  try {
    return fn();
  } finally {
    ContextStack.pop();
  }
}

/**
 * Returns current context value
 */
export function getContext<C = unknown>(): C | undefined {
  return ContextStack[ContextStack.length - 1];
}


/**
 * Decorator to run a class method inside a context
 *
 * @param _target - target class
 * @param _propertyKey - method name
 * @param descriptor - method descriptor
 */
export function WithContext(_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    // The first argument should be the context (context payload)
    const context = args[0]; // context will be the first argument passed to the method

    // Execute the method within the provided context
    return runWithContext(context, () => originalMethod.apply(this, args));
  };

  return descriptor;
}
