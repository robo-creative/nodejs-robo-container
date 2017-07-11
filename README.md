# Robo-Container
A Dependency Injection library for NodeJS
## Installing ##

Run following command to install:

```shell

npm install --save robo-container
```

## Getting Started ##

Import the container to your code:

```javascript

var container = require('robo-container');
```

or use '$' to simplify the container name, should you haven't used this symbol yet:

```javascript

var $ = require('robo-container'); // more convenient.
```

Let's say you want to build a car that has an engine and a fuel tank. When the car starts, it checks if the fuel tank is empty or not. If not, it starts the engine, otherwise it asks you to refuel.

```javascript

function FuelTank () {
    
    this.isEmpty = function() {
        return false;
    }
}

function Engine() {

    this.start = function() {
        console.log('Engine started');
    }
}

function Car(engine, fuelTank) {

    this.start = function() {
        console.log('Car starting...'); 
        if (fuelTank.isEmpty()) {
            console.log('Out of fuel. Please refuel.');
            return;
        }
        engine.start();
        console.log('Car started. Ready to go.');
    }
}
```

_You can use Class declaration instead of Function, as they are one and Robo-Container naturally supports ES6 Class declaration_

Use container to map the Engine to any name you want. For example:

```javascript

$.bind('an engine').to(Engine);
```

From now whenever 'an engine' is used in a dependency, it should be satisfied with an instance of Engine. Do the same for FuelTank:

```javascript

$.bind('a fuel tank').to(FuelTank);
```

For the Car, more than a name, it needs 'an engine' and 'a fuel tank':

```javascript

$.bind('my car').to(Car).use('an engine', 'a fuel tank');
```

Notice the order of Engine and FuelTank in the statement above. The 'an engine' must be placed first as Engine comes first in Car's constructor respectively.

Now build your Car and start it:

```javascript

$.resolve('my car').start();
```

Or you can use this shortcut for more convenient:

```javascript
$('my car').start();
```

Run the application. Output displayed in console will look like:

```
Car starting...
Engine started
Car started. Ready to go.
```

## Contract ##

A contract could be either a name or a function that mimics a type (e.g Engine, FuelTank declared in the sample above). If a function is given, its name will be used for binding. Thus, following statement:

```javascript

$.bind(Car).to(Car); // use class Car as contract
```

is equivalent to:

```javascript

$.bind('Car').to(Car); // because Car.name === 'Car'
```

but not equivalent to:

```javascript

$.bind('my car').to(Car); // because Car.name !== 'my car'
```

The binding statements for Engine, FuelTank, and Car can be simplified as following:

```javascript

$.bind(Engine).to(Engine); // equivalent to $.bind('Engine').to(Engine);
$.bind(FuelTank).to(FuelTank); // equivalent to $.bind('FuelTank').to(FuelTank);
$.bind(Car).to(Car).use(Engine, FuelTank); // equivalent to $.bind('Car').to(Car).use('Engine', 'FuelTank');

$(Car).start(); // equivalent to $('Car').start()

```

_Do not use anything that doesn't have a name or any empty string as contract. Otherwise the container will throw error._

## Bindings ##

### Class Binding ###

```javascript

$.bind(a contract).to(a constructor);
```

This maps a Contract to a Class. The component will be resolved by invoking the class's constructor at runtime. The example above already demonstrated this by binding 'a fuel tank' to the class FuelTank:

```javascript

$.bind('a fuel tank').to(FuelTank);
```

### Method Binding ###

```javascript

$.bind(a contract).to(a method);
```

This maps a Contract with a Building Method that builds the component. The component will be resolved as returning result of method invocation. For example: 

```javascript

var buildCar = function(engine, fuelTank)  {
    var car = new Car(engine, fuelTank);
    // more car initialization here.
    ...
    return car;
};

$.bind('my car').to(buildCar).use('an engine', 'a fuel tank');
```
This approach is useful in case of building a component requires more complex steps than just calling its constructor.

### Instance Binding ###

```javascript

$.bind(a contract).to(an instance);
```

This maps a Contract with an instance and then returns that instance as the result of component resolution. This approach simply stores the component in the container so there is no needs to invoke any constructor/method. 

For example, say you want to add Manufacturer information to your Car and display it:

```javascript

function Manufacturer(name) {
    this.name = name;
};

function Car(engine, fuelTank, manufacturer) {

    this.toString = function() {
        return `Manufacturer: ${manufacturer.name}`;
    }
};
```

Create some manufacturers and store them in the container:

```javascript

var BMW = new Manufacturer('BMW');
var Porsche = new Manufacturer('Porsche');

$.bind('BMW').to(BMW);
$.bind('Porsche').to(Porsche);
```

Now choose a favorite manufacturer for your car. For e.g Porsche:

```javascript

$.bind('my car').to(Car).use('an engine', 'a fuel tank', 'Porsche'); // manufacturer comes last in Car's constructor.

// display car information in console:
console.log($('my car')); // will be: "Manufacturer: Porsche"
```

_Unlike Class Binding and Method Binding, Instance Binding requires a manual component instantiation by yourself. In consequence, it costs computer resources at registration. Too many Instance Binding statements at once may drastically draw your application performance. So you are recommended to avoid using this eager binding when possible and use lazy binding (Class Binding & Method Binding) instead._

## Values ##

```javascript

$.value(a value object);
```

This returns a Value Object instead of a must-build dependency. For e.g car color, car model are properties which can accept values other than some must-build objects.

Let's say you want to add _model_ to your Car. The model could be a string:

```javascript

function Car(engine, fuelTank, manufacturer, model) {

    this.toString = function() {
        return `Manufacturer: ${manufacturer.name} | Model: ${model}`;
    }
};
```

Now let's build your car using a fixed model:

```javascript

$.bind('my car').to(Car).use('an engine', 'a fuel tank', 'BMW', $.value('320i'));

console.log($('my car')) // output displays "Manufacturer: BMW | Model: 320i"
```

_The value given in `$.value()` could be anything and will be returned intact._

## Overwriting Bindings ##

### Permanent Overwriting ###

A binding can be permanently overwritten by any others having the same contract. The last comer wins. For example:

```javascript

$.bind('my car').to(Car).use('an engine', 'a fuel tank', 'Porsche'); // manufacturer of 'my car' is Porsche.
$.bind('my car').to(Car).use('an engine', 'a fuel tank', 'BMW'); // manufacturer of 'my car' is now BMW.

// display car information in console:
console.log($('my car')); // will be: "Manufacturer: BMW"
```

The previous binding using Porsche will be gone. Meaning `$('my car')` will always return a BMW in result.

### Temporary Overwriting ###

This allows you to temporarily replace a binding in a particular context while still keeping the old one. The Temporary Overwriting can be done with an Identity Map.

Getting back to Getting Started, you wanted to have a car like this:

```javascript

$.bind('an engine').to(Engine);
$.bind('a fuel tank').to(FuelTank);
$.bind('my car').to(Car).use('an engine', 'a fuel tank');
```

The statement `$('my car')` will persistently give you a car with an Engine and a not-empty-FuelTank everytime it is called. Now what if you want to temporarily 'hijack' the FuelTank and replace it with an EmptyFuelTank for awhile?

```javascript

function EmptyFuelTank() {

    this.isEmpty = function() {
        return true; // of course, it's always empty.
    }
}
```

The replacement can be done easily. First, create an object as an Identity Map and put your EmptyFuelTank into it, then pass the map to the component resolution method:

```javascript

var identityMap = { 'a fuel tank': new EmptyFuelTank() };
$('my car', identityMap).start();
```

The output in cosole now looks like:

```
Car starting...
Out of fuel. Please refuel.
```

*Notes*

- Key must be the same as the contract of which you want to replace. In the sample above, it's 'a fuel tank' that was used in the first binding statement.
- The subtitute must be a component (a `new EmptyFuelTank()`). Class and Method are NOT applicable.
- After `$('my car', identityMap)` is called, the map will also contain all resolved components and dependencies during the process (i.e your car alongside with its engine and fuel tank). For example:

```javascript

var identityMap = { 'a fuel tank': new EmptyFuelTank() };
$('my car', identityMap).start();

var engine = identityMap['an engine']; // the resolved Engine.
var fuelTank = identityMap['a fuel tank']; // the EmptyFuelTank.
var myCar = identityMap['my car']; // your Car with an Engine and an EmptyFuelTank.
```

- Not only for replacement, the Identity Map is also useful in case of you want to share your resolved dependencies across some component resolutions. Below is an example:

```javascript

// an inspector that inspects car fuel tank's condition
function FuelInspector(fuelTank) {

    this.inspect = function() {
        if (fuelTank.isEmpty) console.log('Warning: Bingo fuel!!!');
        else console.log('Ready.');
    }
}

$.bind(FuelInspector).to(FuelInspector).use('a fuel tank');

var map = {}; // just an empty object, we don't intend to replace anything.
$('my car', map).start(); // map now contains 'an engine', 'a fuel tank' and 'my car'

// following inspector will use 'a fuel tank' encapsulated in the map 
// rather than asking container to resolve the FuelTank again.
$(FuelInspector, map).inspect();
```

- Value Binding will not be returned as part of Identity Map, based on the fact that you usually use `$.value()` with pre-defined constants which are already shared among your components.

_Although Identity Map may act like a cache and help you reduce resolution time in some cases, you should be aware of wrong component resolution it may bring back to you in results. Refer to Incorrect Resolution with Identity Map for more information._

## Injections ##

Dependencies can be injected in two ways: Constructor Injection with `.use()` and Property Injection with `.set()`.

### Constructor Injection ###

```javascript

$.bind(a contract).to(a concrete).use(some dependencies);
```

This allows you to inject dependencies via component's constructor. Remember that the order of dependencies must be same as of constructor's parameters. Following binding statement is an example of incorrect order that leads to an application error:

```javascript

$.bind('my car').to(Car).use('a fuel tank', 'an engine'); // incorrect! Engine must be first.
```

No needs to always fully provide all dependencies as all parameters for the constructor. E.g if you want to just inject the Engine to the Car but the FuelTank, you can skip 'a fuel tank' as in following statement:

```javascript

$.bind('my car').to(Car).use('an engine'); // skip the fuel tank to inject it later on.
```

_It is NOT possible to skip the Engine but keep the FuelTank, because of constructor invocation is actually intrinsic function invocation in JS._

### Property Injection ###

```javascript

$.bind(a contract).to(a concrete).set(property mappings);
```

When your component has many dependencies and you want to inject them all, Constructor Injection maybe painful as you will have to deal with having so many parameters in your component's constructor. Considering having too many parameters in a function is likely a proof of code smell. Moreover, not all dependencies are collaborators of your component. Some of them can be Value Objects (e.g the Manufacturer of your Car). Therefore it is much better to declare them as properties of your component and inject them via Property Injection.

Let's go back to your Car. Now imagine you want to move Manufacturer off Car's constructor and make it a property of your car, similar to property 'model':

```javascript

function Manufacturer(name) {
    this.name = name;
};

function Car(engine, fuelTank) {

    this.manufacturer = undefined; 
    this.model = undefined;

    this.toString = function() {
        return `Manufacturer: ${manufacturer.name} | Model: ${model}`;
    }
};
```

Both manufacturer and model are initially set to undefined and will be injected at runtime. Now let's bind these properties to your car and build:

```javascript

$.bind('my car').to(Car).set({ manufacturer: 'BMW', model: $.value('320i') }); 

console.log($('my car')); // output will look like: "Manufacturer: BMW | Model: 320i"
```

You can also combine both Constructor Injection and Property Injection in one statement:

```javascript

$.bind('my car')
    .to(Car)
    .use('an engine', 'a fuel tank')
    .set({ manufacturer: 'BMW', model: $.value('320i') }); 

// build the car and start it
var myCar = $('my car');
console.log(`My Car Information: [${myCar}]`);
myCar.start();
```

The console output will look like:

```
My Car Information: [Manufacturer: BMW | Model: 320i]
Car starting...
Engine started
Car started. Ready to go.
```

## Component Life Cycle ##

### Transient ###

By default, Class Binding and Method Binding implicitly set component life cycle to Transient. Meaning everytime a `$(contract)` is called, it will return a different component in result. 

In the below sample, two calls to `$('my car')` will return two different instances of Car:

```javascript

$.bind('my car').to(Car).use('an engine', 'a fuel tank');

var car1 = $('my car');
var car2 = $('my car'); // a different car, different engine and fuel tank.
```

### Singleton ###

Contrary to Transient, Singleton restricts number of instances of a particular type to only one. Meaning multiple calls to `$(contract)` will return the same component at all time.

Intance Binding is already singleton as component resolution returns the instance given in binding statement.

```javascript

var i = 0;

function Sequence() {
    this.seq = ++i;

    this.toString = function() {
        return `SEQ: ${this.seq}`;
    }
};

$.bind('a sequence').to(new Sequence()); // Instance Binding.

console.log($('a sequence')); // will print out "SEQ: 1"
console.log($('a sequence')); // will print out "SEQ: 1"
console.log($('a sequence')); // will print out "SEQ: 1"
```

As told, Instance Binding has some drawbacks compared to Class Binding and Method Binding. You may want to use Singleton with Class Binding and Method Binding for their advantages. To make a Class Binding or Method Binding singleton, place `.asSingleton()` after `.to()` or at the end of binding statement. Following statement specifies that class Sequence will has only one singleton instance:

```javascript

$.bind('a sequence').to(Sequence).asSingleton();
```

Similarily, a Method Binding will be singleton if `.asSingleton()` is specified:

```
#!javascript

$.bind('a sequence').to(function () { return new Sequence() }).asSingleton();
```

Following statements will print the same result to console:

```javascript

console.log($('a sequence')); // will print out "SEQ: 1"
console.log($('a sequence')); // will print out "SEQ: 1"
console.log($('a sequence')); // will print out "SEQ: 1"
```

Let's get back to your Car. As there is only one manufacturer called BMW in the world, you can make 'BMW' singleton with Method Binding:

```javascript

$.bind('BMW').to(function() { return new Manufacturer('BMW')}).asSingleton();
```

or with Class Binding:

```javascript

$.bind('BMW').to(Manufacturer).use($.value('BMW')).asSingleton();
```

Now if you have a BMW and so does Peter, his car and yours will refer to the same manufacturer, BMW.

```javascript

$.bind('my car').to(Car).set({ manufacturer: 'BMW' });
$.bind('Peter car').to(Car).set({ manufacturer: 'BMW' });

var myCar = $('my car');
var PeterCar = $('Peter car'); // different with myCar, but same manufacturer.
```

What about a singleton Engine? No. Considering every single car has its own engine so making Engine singleton is a no-no.

## Common Problems ##

### Problem 1: Circular Dependency ###

This is one of the most common problems. Let's say a Husband has a Wife and a Wife has a Husband. Each of them is injected to each other via constructor:

```javascript

function Husband (wife) {

};

function Wife (husband) {

};
```

Now we have Jim, a husband whose wife is Sarah. The binding statements for them look like:

```javascript

$.bind('Jim').to(Husband).use('Sarah');
$.bind('Sara').to(Wife).use('Jim');
```

Now the problem comes out. If we try to resolve Jim, the container automatically resolves Sarah. But while resolving Sarah, it realizes Jim should be resolved as Sarah's husband first. The container then goes back to resolving Jim again, then it finds Sarah should be resolved as Jim's wife, then it switches back to resolving Sarah and so on. This is an infinitive loop and will very soon lead to an application crash.

```javascript

var Jim = $('Jim'); // application crashes.
```

There are three ways to resolve this problem: _Introducing A Third Class_; _Using Identity Map_; and _Manual Assignment_. Each method has its own pros and cons and is explained in upcoming sections.

#### Introducing a Third Class ####

This approach is simple. Instead of making Husband depend on Wife and vice versa, you extract all stuffs from Wife which are used by Husband and all stuffs from Husband which are used by Wife and combine them into a third class. Let's call the third class a MiddleMan as in following:

```javascript

function Husband (middleMan) {

};

function Wife (middleMan) {

};

function MiddleMan() {
    // here comes common stuffs from both Husband and Wife.
}
``` 

So the bindings:

```javascript

$.bind('a middle man').to(MiddleMan);
$.bind('Jim').to(Husband).use('a middle man');
$.bind('Sarah').to(Wife).use('a middle man');
```

As you can see, Jim no longer depends on Sarah and nor does Sarah. They both depends on the middle man so the infinitive loop is now completely gone.

Despite the ease of introducing the third class, this way somehow violates the Single Responsibility Principle. Why do we extract stuffs from Husband/Wife which are naturally belong to him/her? Just because of they depend on each other? That's the main reason. Yet it's not something that motivates us to do so.

#### Using an Identity Map ####

If you are an Object-Oriented bigot and you don't want to break the SRP, this method is suitable with you. 

Be explained how the container resolves components with Identity Map first. Robo-Container resolves a certain component in following steps:

1. It invokes constructor of the component first, all dependencies given in `.use()` are satisfied prior to constructor invocation, then
1. If an Identity Map is given, saves the just-instantiated component to the map, then
1. Lastly injects all properties to the component. All property dependencies given in `.set()` are resolved in this step.

You might noticed that the component is put in the Identity Map in step 2, prior to injecting its properties. This is the key to solving the problem. Move either Husband or Wife from each other constructor and make them a property of the other.

Let's modify the Wife a little bit and leave Husband as is:

```javascript

function Husband (wife) {

};

function Wife () {

    this.husband = undefined; // will be injected via Property Injection.
};
```

Now the bindings:

```javascript

$.bind('Jim').to(Husband).use('Sarah');
$.bind('Sarah').to(Wife).set({ husband: 'Jim' });
```

Now let's resolve Sarah with an Identity Map:

```javascript

var Sarah = $('Sarah', {}); // no problems, no crashes.
```

What happened? Let's take a look at the flow and see how Robo-Container resolved Sarah:

1. It invoked Wife's constructor to create Sarah first, then
1. it stored Sarah in the Identity Map, as `{ 'Sarah': wife }`, then
1. it resolved properties of Sarah and it realized Sarah has Jim, the husband. It switched to resolving Jim with the given Identity Map that was containing Sarah, then
1. while resolving Jim, it realized Jim has a wife named Sarah. But Sarah was already in the Identity Map so it just simply got Sarah from the map instead of resolving Sarah once again.

The Identity Map is very helpful in this case. But again, you should be aware of getting wrong component in results.

#### Manual Assignment ####

This method simply leaves member assignment to you. It can be done in several ways. You can either:

Remove both from each other and manually assign them

```javascript

function Husband () {
    this.wife = undefined; // will be manually set later on.
};

function Wife () {
    this.husband = undefined; // will be manually set later on.
};

$.bind('Jim').to(Husband); // no Sarah here.
$.bind('Sarah').to(Wife); // no Jim.

var Sarah = $('Sarah');
var Jim = $('Jim');

// now assign Sarah to Jim and vise versa:
Sarah.husband = Jim;
Jim.wife = Sarah;
```

or remove one of them from the other and manually assign reference for the rest:

```javascript

function Husband () {
    this.wife = undefined; // will be automatically injected
};

function Wife () {
    this.husband = undefined; // will be manually set later on.
};

$.bind('Jim').to(Husband).set({ wife: 'Sarah'});
$.bind('Sarah').to(Wife); // no Jim.

var Sarah = $('Sarah');
var Jim = $('Jim');

Sarah.husband = Jim; // Jim.wife is already Sarah.
```

This method requires some more manual work but it's undoubtedly the most reliable one. No Identity Maps. No violations of SRP.

Whenever you need Sarah, you will have to resolve Jim, then Sarah, and finally set Sarah's husband to Jim. This may upset you in case of Sarah is frequently used in different places/context. To avoid this annoyance, you can make binding statements better for Sarah by using a Method Binding as below:

```javascript

function Husband () {
    this.wife = undefined; // will be automatically injected
};

function Wife () {
    this.husband = undefined; // will be manually set later on.
};

$.bind('Jim').to(Husband).set({ wife: 'Sarah'});
$.bind(Wife).to(Wife);
$.bind('Sarah')
    .to(function(husband, wife) { 
        wife.husband = husband;    
        return wife;
    })
    .use('Jim', Wife);
```

From now, $('Sarah') will return a Wife whose husband is Jim:

```javascript

var Sarah = $('Sarah'); // Sarah.husband is already Jim.
```

### Problem 2: Incorrect Resolution with Identity Map ###

As designed, the Identity Map ensures a certain component is loaded only once. Later component lookups will refer to the loaded component in the map. This is good in terms of performance, Temporary Overwriting, Unit Testing, and resolving cicular dependency as well.

But here emerges a potential problem: every resolvable component in a particular context using an Identity Map will be (un)expectedly singleton within that context. Because of the map restricts the load of a component to just once.

The following example demonstrates an incorrect component resolution with Identity Map:

Getting back to Jim and Sarah, now each of them has a Wallet. Jim's wallet is completely different with Sarah's. You may think of declaring Wallet as a Transient component:

```javascript

var wid = 0; // we use this to identify a wallet.

function Wallet() {
    this.id = ++wid; // every new Wallet() will have a different incremental id.
};

$.bind(Wallet).to(Wallet); // transient, of course.

$.bind('Jim').to(Husband).use('Sarah').set({ wallet: Wallet);
$.bind('Sarah').to(Wife).set({ husband: 'Jim', wallet: Wallet });
```

Now let's resolve Sarah and Jim with an Identity Map and see what happens:

```javascript

var map = {};
var Sarah = $('Sarah', map);
var Jim = $('Jim', map); // or Sarah.husband

console.log(`Sarah's wallet id: ${Sarah.wallet.id}`); // will be 1.
console.log(`Jim's wallet id: ${Jim.wallet.id}`); // will be 1 too.
```

Contrary to our expectation, Sarah and Jim are now having same wallet. This is because of after resolving Sarah, the resolved Wallet would be added to the map and then the container would use it during resolving Jim, instead of creating a new wallet for him.

To avoid this problem with Identity Map, you can declare two different binding statements for Jim's wallet and Sarah's:

```javascript

$.bind('Jim wallet').to(Wallet);
$.bind('Sarah wallet').to(Wallet);

$.bind('Jim').to(Husband).use('Sarah').set({ wallet: 'Jim wallet');
$.bind('Sarah').to(Wife).set({ husband: 'Jim', wallet: 'Sarah wallet' });
```
