import { ApolloLink, Observable, Operation } from 'apollo-link';
import { getOperationAST } from 'graphql';
import { PubSubEngine } from 'graphql-subscriptions';
import { $$asyncIterator } from 'iterall';

export interface LogOptions {
  logger?: (...args: any[]) => void;
  formatter?: (req: any) => string;
}

const stripCircular = (circularData: any, seen: any[] | null) => {
  const notCircularData = Array.isArray(circularData) ? [] : {};
  seen = seen || [];
  seen.push(circularData);

  Object.getOwnPropertyNames(circularData).forEach(key => {
    if (!circularData[key] || (typeof circularData[key] !== 'object' && !Array.isArray(circularData[key]))) {
      notCircularData[key] = circularData[key];
    } else if (seen.indexOf(circularData[key]) < 0) {
      notCircularData[key] = stripCircular(circularData[key], seen.slice(0));
    } else {
      notCircularData[key] = '[Circular]';
    }
  });

  return notCircularData;
};

export function defaultFormatter(req: any): string {
  return !req.variables || Object.keys(req.variables).length === 0
    ? req.operationName
    : `${req.operationName}(${JSON.stringify(req.variables)})`;
}
// tslint:disable-next-line
export const defaultLogger = (...args: any[]): void => console.log.apply(null, args);

const getDefaultLogOptions = (options: LogOptions): LogOptions => {
  const result = options;
  if (!result.formatter) {
    result.formatter = defaultFormatter;
  }
  if (!result.logger) {
    result.logger = defaultLogger;
  }

  return result;
};
export class LoggedPubSub implements PubSubEngine {
  private pubsub: PubSubEngine;
  private options: LogOptions;

  constructor(pubsub: PubSubEngine, options?: LogOptions) {
    this.pubsub = pubsub;
    this.options = getDefaultLogOptions(options);
  }

  public publish(triggerName: string, payload: any) {
    this.options.logger('pubsub publish', triggerName, payload);
    return this.pubsub.publish(triggerName, payload);
  }

  public async subscribe(triggerName: string, onMessage: (...args: any[]) => void, options: any): Promise<number> {
    let result;
    try {
      const logHandler = (...msgArgs: any[]) => {
        this.options.logger('pubsub msg', `${triggerName}(${JSON.stringify(msgArgs)})`);
        onMessage(msgArgs);
      };
      result = await this.pubsub.subscribe(triggerName, logHandler, options);
    } finally {
      this.options.logger('pubsub subscribe', triggerName, '=>', result);
    }
    return result;
  }

  public unsubscribe(subId: number): void {
    this.options.logger('pubsub unsubscribe', subId);
    this.pubsub.unsubscribe(subId);
  }

  public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this.pubsub, triggers, this.options);
  }
}

class PubSubAsyncIterator<T> implements AsyncIterator<T> {
  private triggers: string[];
  private asyncIter: AsyncIterator<T>;
  private options: LogOptions;

  constructor(pubsub: PubSubEngine, triggers: string | string[], options?: LogOptions) {
    this.asyncIter = pubsub.asyncIterator<T>(triggers);
    this.triggers = typeof triggers === 'string' ? [triggers] : triggers;
    this.options = getDefaultLogOptions(options);
  }

  public async next(value?: any): Promise<IteratorResult<T>> {
    let result;
    try {
      result = await this.asyncIter.next();
    } finally {
      this.options.logger(JSON.stringify(result), '<= ' + JSON.stringify(this.triggers) + '->next');
    }
    return result;
  }

  public async return?(value?: any): Promise<IteratorResult<T>> {
    let result;
    try {
      result = await this.asyncIter.next();
    } finally {
      this.options.logger(JSON.stringify(result), '<= ' + JSON.stringify(this.triggers) + '->next');
    }
    return result;
  }

  public throw?(e?: any): Promise<IteratorResult<T>> {
    let result;
    try {
      result = this.asyncIter.throw(e);
    } finally {
      this.options.logger(JSON.stringify(this.triggers) + `->throw('${JSON.stringify(e)}') =>`, JSON.stringify(result));
    }
    return result;
  }

  public [$$asyncIterator]() {
    return this;
  }
}

export const wrapPubSub = (pubsub: PubSubEngine, options: LogOptions): PubSubEngine =>
  new LoggedPubSub(pubsub, options);

export class LoggingLink extends ApolloLink {
  private options: LogOptions;

  constructor(options?: LogOptions) {
    super();
    this.options = getDefaultLogOptions(options);
  }

  public request(operation, forward) {
    const operationAST = getOperationAST(operation.query, operation.operationName);
    const isSubscription = !!operationAST && operationAST.operation === 'subscription';
    if (!isSubscription) {
      this.options.logger(`loading <= ${this.options.formatter(operation)}`);
    }
    return new Observable(observer => {
      if (isSubscription) {
        this.options.logger(`subscribe <= ${this.options.formatter(operation)}`);
      }
      const sub = forward(operation).subscribe({
        next: result => {
          this.options.logger(`${JSON.stringify(result)} <= ${this.options.formatter(operation)}`);

          observer.next(result);
        },
        error: error => {
          this.options.logger(`${JSON.stringify(error)} <=e ${this.options.formatter(operation)}`);

          observer.error(error);
        },
        complete: observer.complete.bind(observer)
      });
      return () => {
        if (isSubscription) {
          this.options.logger(`unsubscribe <= ${this.options.formatter(operation)}`);
        }
        sub.unsubscribe();
      };
    });
  }
}

export interface FormatterInput {
  operation: Operation;
  result?: any;
  error?: any;
}

export function formatResponse(logOptions: LogOptions, response: any, ...options: any) {
  const logOpts = getDefaultLogOptions(logOptions);
  logOpts.logger(`${JSON.stringify(response)} <= ${logOpts.formatter(options[0])}`);

  return response;
}

export default (options?: LogOptions) => ({
  link: new LoggingLink(options),
  formatResponse: formatResponse.bind(options),
  wrapPubSub: (pubsub: PubSubEngine) => wrapPubSub(pubsub, options)
});
