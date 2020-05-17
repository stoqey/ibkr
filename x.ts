import { timeoutCollection } from 'time-events-manager';
// creating a timeout

function myFunc() {
    console.log("Hello world");
}

var myTimeoutId = setTimeout(myFunc, 5000);

// Managing timeouts via timeoutCollection object

timeoutCollection.get(0);
timeoutCollection.getById(myTimeoutId as any); //Both returning the timeout object created

timeoutCollection.getScheduled(); //Returns an array of timeout objects that have not yet executed
timeoutCollection.getCompleted(); //Returns an array of timeout objects that have been executed
timeoutCollection.getAll(); //Returns an array of timeout objects

timeoutCollection.remove(myTimeoutId as any);
timeoutCollection.removeAll();