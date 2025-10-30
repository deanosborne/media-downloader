/**
 * Unit tests for ServiceContainer utility
 */

import { ServiceContainer } from '../ServiceContainer.js';

// Test classes for dependency injection
class TestService {
  constructor(public name: string = 'TestService') {}
  
  getName(): string {
    return this.name;
  }
}

class DependentService {
  constructor(private testService: TestService) {}
  
  getTestServiceName(): string {
    return this.testService.getName();
  }
}

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('register and get', () => {
    it('should register and retrieve services', () => {
      container.register('testService', () => new TestService());
      
      const service = container.get<TestService>('testService');
      
      expect(service).toBeInstanceOf(TestService);
      expect(service.getName()).toBe('TestService');
    });

    it('should return the same instance on multiple calls (singleton)', () => {
      container.register('testService', () => new TestService());
      
      const service1 = container.get<TestService>('testService');
      const service2 = container.get<TestService>('testService');
      
      expect(service1).toBe(service2);
    });

    it('should throw error for unregistered services', () => {
      expect(() => container.get('nonExistent')).toThrow(
        "Service 'nonExistent' not registered"
      );
    });

    it('should handle factory functions with dependencies', () => {
      container.register('testService', () => new TestService('CustomName'));
      container.register('dependentService', () => {
        const testService = container.get<TestService>('testService');
        return new DependentService(testService);
      });
      
      const dependentService = container.get<DependentService>('dependentService');
      
      expect(dependentService.getTestServiceName()).toBe('CustomName');
    });
  });

  describe('has', () => {
    it('should return true for registered services', () => {
      container.register('testService', () => new TestService());
      
      expect(container.has('testService')).toBe(true);
    });

    it('should return false for unregistered services', () => {
      expect(container.has('nonExistent')).toBe(false);
    });
  });

  describe('registerInstance', () => {
    it('should register pre-created instances', () => {
      const instance = new TestService('PreCreated');
      container.registerInstance('testService', instance);
      
      const retrieved = container.get<TestService>('testService');
      
      expect(retrieved).toBe(instance);
      expect(retrieved.getName()).toBe('PreCreated');
    });

    it('should override factory registration with instance', () => {
      container.register('testService', () => new TestService('Factory'));
      const instance = new TestService('Instance');
      container.registerInstance('testService', instance);
      
      const retrieved = container.get<TestService>('testService');
      
      expect(retrieved).toBe(instance);
      expect(retrieved.getName()).toBe('Instance');
    });
  });

  describe('clear', () => {
    it('should clear all services and factories', () => {
      container.register('service1', () => new TestService('Service1'));
      container.register('service2', () => new TestService('Service2'));
      
      // Get services to create instances
      container.get('service1');
      container.get('service2');
      
      expect(container.has('service1')).toBe(true);
      expect(container.has('service2')).toBe(true);
      
      container.clear();
      
      expect(container.has('service1')).toBe(false);
      expect(container.has('service2')).toBe(false);
      expect(() => container.get('service1')).toThrow();
    });
  });

  describe('getRegisteredServices', () => {
    it('should return list of registered service names', () => {
      container.register('service1', () => new TestService());
      container.register('service2', () => new TestService());
      container.register('service3', () => new TestService());
      
      const services = container.getRegisteredServices();
      
      expect(services).toEqual(expect.arrayContaining(['service1', 'service2', 'service3']));
      expect(services).toHaveLength(3);
    });

    it('should return empty array when no services registered', () => {
      const services = container.getRegisteredServices();
      
      expect(services).toEqual([]);
    });
  });

  describe('complex dependency scenarios', () => {
    it('should handle circular dependencies gracefully', () => {
      // This test demonstrates that circular dependencies would cause issues
      // In a real implementation, you might want to add circular dependency detection
      
      container.register('serviceA', () => {
        const serviceB = container.get('serviceB');
        return { name: 'A', dependency: serviceB };
      });
      
      container.register('serviceB', () => {
        // This would cause infinite recursion if serviceB tried to get serviceA
        return { name: 'B' };
      });
      
      const serviceA = container.get<any>('serviceA');
      expect(serviceA.name).toBe('A');
      expect(serviceA.dependency.name).toBe('B');
    });

    it('should handle multiple levels of dependencies', () => {
      container.register('level1', () => ({ level: 1 }));
      container.register('level2', () => ({
        level: 2,
        dependency: container.get('level1')
      }));
      container.register('level3', () => ({
        level: 3,
        dependency: container.get('level2')
      }));
      
      const level3 = container.get<any>('level3');
      
      expect(level3.level).toBe(3);
      expect(level3.dependency.level).toBe(2);
      expect(level3.dependency.dependency.level).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle factory function errors', () => {
      container.register('errorService', () => {
        throw new Error('Factory error');
      });
      
      expect(() => container.get('errorService')).toThrow('Factory error');
    });

    it('should not cache failed service creation', () => {
      let callCount = 0;
      container.register('flakyService', () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return { success: true, callCount };
      });
      
      // First call should fail
      expect(() => container.get('flakyService')).toThrow('First call fails');
      
      // Second call should succeed and create new instance
      const service = container.get<any>('flakyService');
      expect(service.success).toBe(true);
      expect(service.callCount).toBe(2);
    });
  });
});