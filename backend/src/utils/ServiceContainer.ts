/**
 * Simple dependency injection container for services
 */

import { IServiceContainer } from '../types/service.js';

export class ServiceContainer implements IServiceContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  get<T>(name: string): T {
    // Return cached instance if available
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Create new instance using factory
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service '${name}' not registered`);
    }

    const instance = factory();
    this.services.set(name, instance);
    return instance as T;
  }

  has(name: string): boolean {
    return this.factories.has(name);
  }

  // Register a singleton instance directly
  registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  // Clear all services (useful for testing)
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }

  // Get all registered service names
  getRegisteredServices(): string[] {
    return Array.from(this.factories.keys());
  }
}

// Default container instance
export const defaultServiceContainer = new ServiceContainer();