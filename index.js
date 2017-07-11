function Container() {
    this.componentDescriptions = {};
    this.builders = {};

    this.bind = function (contract) {
        var name = this.getName(contract);
        if (name === "") throw 'invalid contract';
        var componentDescription = new ComponentDescription(name);
        this.componentDescriptions[name] = componentDescription;
        return new ConcreteSpecification(componentDescription);
    };

    this.resolve = function (contract, identityMap) {
        if (contract instanceof Value) {
            return contract.value;
        }
        var name = this.getName(contract);
        if (identityMap) {
            return undefined === identityMap[name] ? this.getBuilder(name).build(this, this.componentDescriptions[name], identityMap)
                : identityMap[name]
        }
        return this.getBuilder(name).build(this, this.componentDescriptions[name]);
    };

    this.value = function (value) {
        return new Value(value);
    };

    this.getBuilder = function (name) {
        if (undefined === this.builders[name]) {
            if (undefined === this.componentDescriptions[name]) throw 'component not found';
            this.builders[name] = this.componentDescriptions[name].builder;
        }
        return this.builders[name];
    };

    this.getName = function (contract) {
        return typeof contract === 'function' ? contract.name : contract;
    }
};

function Value(value) {
    this.value = value;
};

function ConcreteSpecification(description) {
    this.to = function (concrete) {
        if (undefined === concrete || null === concrete) throw 'concrete not defined';
        if (typeof concrete === 'function') {
            if (concrete.name !== "") {
                description.builder = new CtorBuilder(concrete);
            } else {
                description.builder = new FuncBuilder(concrete);
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

function ComponentDescription(name) {
    this.name = name;
    this.builder = undefined;
    this.dependencies = undefined;
    this.injectProperties = undefined;
};

function ComponentBuilder() {

    this.build = function (container, componentDescription, identityMap) {
        var component = this.createComponent(this.buildDependencies(container, componentDescription.dependencies, identityMap));
        if (identityMap)
            identityMap[componentDescription.name] = component;
        this.injectProperties(container, component, componentDescription.injectProperties, identityMap);
        return component;
    };

    this.buildDependencies = function (container, dependencies, identityMap) {
        var resolved = [];
        if (undefined !== dependencies) {
            dependencies.forEach(function (dependency) {
                resolved.push(container.resolve(dependency, identityMap));
            });
        }
        return resolved;
    };

    this.injectProperties = function (container, component, properties, identityMap) {
        if (undefined === properties) return;
        for (var property in properties) {
            if (properties.hasOwnProperty(property))
                component[property] = container.resolve(properties[property], identityMap);
        };
    }

    this.createComponent = function (dependencies) {
        throw 'must be implemented in subclass';
    }
}

function WrapperBuilder(instance) {
    ComponentBuilder.call(this);

    this.build = function (container, componentDescription, identityMap) {
        return instance;
    }
};
WrapperBuilder.prototype = new ComponentBuilder();

function CtorBuilder(ctor) {
    ComponentBuilder.call(this);

    this.createComponent = function (dependencies) {
        var boundConstructor = ctor.bind.apply(ctor, [null].concat(dependencies));
        return new boundConstructor();
    }
};
CtorBuilder.prototype = new ComponentBuilder();

function FuncBuilder(fn) {
    ComponentBuilder.call(this);

    this.createComponent = function (dependencies) {
        return fn.apply(null, dependencies);
    }
};
FuncBuilder.prototype = new ComponentBuilder();

function SingletonBuilder(inner) {
    ComponentBuilder.call(this);
    this.instance = undefined;

    this.build = function (container, componentDescription, identityMap) {
        if (undefined === this.instance) {
            this.instance = inner.build(container, componentDescription, identityMap);
        }
        return this.instance;
    }
};
SingletonBuilder.prototype = new ComponentBuilder();

var roboContainer = function (contract, identityMap) {
    return new roboContainer.fn.r(contract, identityMap);
};
roboContainer.fn = roboContainer.prototype = new Container();
roboContainer.bind = function(contract) {
    return roboContainer.fn.bind(contract);
};
roboContainer.resolve = function(contract, identityMap) {
    return roboContainer.fn.resolve(contract, identityMap);
};
roboContainer.value = function(value) {
    return roboContainer.fn.value(value);
}
roboContainer.fn.r = function(contract, identityMap) {
    if (!contract) return this;
    return roboContainer.resolve(contract, identityMap);
};

module.exports = roboContainer;