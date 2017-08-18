'use strict';

function Container() {
    var descriptions = new Map();

    var getName = function (contract) {
        return typeof contract === 'function' ? contract.name : contract;
    }

    var getBuilder = function (name) {
        if (!descriptions.has(name)) throw new Error(`Component [${name}] could not be found`);
        return descriptions.get(name).builder;
    };

    this.bind = function (contract) {
        var name = getName(contract);
        if (name === "") throw new Error('Invalid contract');
        var description = {
            name: name
        };
        descriptions.set(name, description);
        return new ConcreteSpecification(description);
    };

    this.resolve = function (contract, identityMap) {
        if (contract instanceof ValueWrapper) {
            return contract.value;
        }
        var name = getName(contract);
        if (identityMap) {
            return undefined === identityMap[name] ? getBuilder(name).build(this, descriptions.get(name), identityMap) :
                identityMap[name]
        } else {
            return getBuilder(name).build(this, descriptions.get(name));
        }
    };

    this.value = function (value) {
        return new ValueWrapper(value);
    };
};

function ValueWrapper(value) {
    this.value = value;
};

function ConcreteSpecification(description) {
    this.to = function (concrete) {
        if (undefined === concrete || null === concrete) throw new Error(`No concrete specified for [${description.name}]`);
        if (typeof concrete === 'function') {
            if (concrete.name !== "") {
                description.builder = new ClassBuilder(concrete);
            } else {
                description.builder = new MethodBuilder(concrete);
            }
        } else {
            description.builder = new WrapperBuilder(concrete);
        }
        return new DependencySpecification(description);
    }
};

function DependencySpecification(description) {
    this.use = function () {
        description.dependencies = [].slice.call(arguments);
        return this;
    };

    this.set = function (properties) {
        description.injectProperties = properties;
        return this;
    };

    this.asSingleton = function () {
        description.builder = new SingletonBuilder(description.builder);
        return this;
    }
};

function ComponentBuilder() {

    var buildDependencies = function (container, dependencies, identityMap) {
        var resolved = [];
        if (undefined !== dependencies) {
            dependencies.forEach(function (dependency) {
                resolved.push(container.resolve(dependency, identityMap));
            });
        }
        return resolved;
    };

    var injectProperties = function (container, component, properties, identityMap) {
        if (undefined === properties) return;
        for (var property in properties) {
            if (properties.hasOwnProperty(property))
                component[property] = container.resolve(properties[property], identityMap);
        };
    };

    this.build = function (container, description, identityMap) {
        var component = this.createComponent(buildDependencies(container, description.dependencies, identityMap));
        if (identityMap && identityMap.hasOwnProperty(description.name))
            identityMap[description.name] = component;
        injectProperties(container, component, description.injectProperties, identityMap);
        return component;
    };

    this.createComponent = function (dependencies) {
        return undefined;
    };
}

function WrapperBuilder(instance) {
    ComponentBuilder.call(this);

    this.build = function (container, description, identityMap) {
        return instance;
    }
};
WrapperBuilder.prototype = Object.create(ComponentBuilder.prototype);
WrapperBuilder.prototype.constructor = WrapperBuilder;

function ClassBuilder(ctor) {
    ComponentBuilder.call(this);

    this.createComponent = function (dependencies) {
        var boundConstructor = ctor.bind.apply(ctor, [null].concat(dependencies));
        return new boundConstructor();
    }
};
ClassBuilder.prototype = Object.create(ComponentBuilder.prototype);
ClassBuilder.prototype.constructor = ClassBuilder;

function MethodBuilder(fn) {
    ComponentBuilder.call(this);

    this.createComponent = function (dependencies) {
        return fn.apply(null, dependencies);
    }
};
MethodBuilder.prototype = Object.create(ComponentBuilder.prototype);
MethodBuilder.prototype.constructor = MethodBuilder;

function SingletonBuilder(inner) {
    ComponentBuilder.call(this);
    this.instance = undefined;

    this.build = function (container, description, identityMap) {
        if (undefined === this.instance) {
            this.instance = inner.build(container, description, identityMap);
        }
        return this.instance;
    }
};
SingletonBuilder.prototype = Object.create(ComponentBuilder.prototype);
SingletonBuilder.prototype.constructor = SingletonBuilder;

var roboContainer = function (contract, identityMap) {
    return roboContainer.fn.r(contract, identityMap);
};
roboContainer.fn = roboContainer.prototype = new Container();
roboContainer.bind = function (contract) {
    return roboContainer.fn.bind(contract);
};
roboContainer.resolve = function (contract, identityMap) {
    return roboContainer.fn.resolve(contract, identityMap);
};
roboContainer.value = function (value) {
    return roboContainer.fn.value(value);
}
roboContainer.fn.r = function (contract, identityMap) {
    if (!contract) return this;
    return roboContainer.resolve(contract, identityMap);
};

module.exports = roboContainer;