import { ApolloLink, NextLink, Operation, Observable } from 'apollo-link';

function debug(...args) {
  console.log.apply(null, args);
}

const formatRequest = req =>
    (!req.variables || Object.keys(req.variables).length === 0)
        ? req.operationName
        : `${req.operationName}(${JSON.stringify(req.variables)})`;

const addPubSubLogger = pubsub => ({
  publish(...args) {
    debug('pubsub publish', args);
    return pubsub.publish(...args);
  },
  async subscribe(opName, handler) {
    let result;
    try {
      const logHandler = (msg) => {
        debug('pubsub msg', `${opName}(${JSON.stringify(msg)})`);
        return handler(msg);
      };
      result = await pubsub.subscribe(opName, logHandler);
    } finally {
      debug('pubsub subscribe', opName, '=>', result);
    }
    return result;
  },
  unsubscribe(...args) {
    debug('pubsub unsubscribe', args);
    return pubsub.unsubscribe(...args);
  },
  asyncIterator(...args) {
    const asyncIter = pubsub.asyncIterator(...args);
    const trigger = args[0];
    return Object.assign({}, asyncIter, {
      async next() {
        let result;
        try {
          result = await asyncIter.next();
        } finally {
          debug(JSON.stringify(result), '<= ' + trigger + '->next');
        }
        return result;
      },
      throw(error) {
        let result;
        try {
          result = asyncIter.throw(error);
        } finally {
          debug(trigger + `->throw('${JSON.stringify(error)}') =>`, JSON.stringify(result));
        }
        return result;
      },
    });
  },
});

export class LoggingLink extends ApolloLink {
  request(operation: Operation, forward: NextLink): Observable<any> {
    const observable = forward(operation);

    if (observable.map) {
      return observable.map(result => {
        debug(`${JSON.stringify(result)} <= ${formatRequest(operation)}`);

        return result;
      });
    } else {
      return new Observable(observer => {
        debug(`subscribe <= ${formatRequest(operation)}`);
        const observerProxy = {
          next(value) {
            debug(`${JSON.stringify(value)} <= ${formatRequest(operation)}`);

            if (observer.next) {
              observer.next(value);
            }
          },
          error(errorValue) {
            debug(`${JSON.stringify(errorValue)} <= ${formatRequest(operation)}`);

            if (observer.error) {
              observer.error(errorValue);
            }
          },
          complete() {
            debug(`unsubscribe <= ${formatRequest(operation)}`);

            if (observer.complete) {
              observer.complete();
            }
          },
        };
        observable.subscribe(observerProxy);
      });
    }
  }
}

export const addApolloLogging = obj => {
  if (obj.publish) {
    return addPubSubLogger(obj);
  } else {
    throw new Error('Unknown object passed to Apollo Logger:' + JSON.stringify(obj));
  }
};
