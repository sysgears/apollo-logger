## Apollo GraphQL Logger

[![npm version](https://badge.fury.io/js/apollo-logger.svg)](https://badge.fury.io/js/apollo-logger) 
[![Twitter Follow](https://img.shields.io/twitter/follow/sysgears.svg?style=social)](https://twitter.com/sysgears)

## Installation

```bash
npm install --save-dev apollo-logger
```

## Usage

For full logging you will need to attach Apollo Logger to:
- Apollo Link
- Apollo Express Server
- And PubSub

``` js
import { LoggingLink, wrapPubSub, formatResponse } from 'apollo-logger';

const logOptions = { logger: console.log };

const link = ApolloLink.from([
  new LoggingLink(logOptions),
  new HttpLink({uri: ...})
);

...

app.use('/graphql', bodyParser.json(), graphqlExpress({ schema: myGraphQLSchema, formatResponse: formatResponse.bind(logOptions) });

...

const pubsub = wrapPubSub(new PubSub(), logOptions);
```

## Sample output

On each example the result of operation comes after `=>`

- Query:
``` js
{"data":{"post":{"id":20,"title":"Post title 20","content":"Post content 20","__typename":"Post","comments":[{"id":39,"content":"Comment title 1 for post 20","__typename":"Comment"},{"id":40,"content":"Comment title 2 for post 20","__typename":"Comment"}]}}} <= post({"id":"20"})
```

- Mutation:
``` js
{"data":{"addCounter":{"amount":21,"__typename":"Counter"}}} <= addCounter({"amount":1})
```

- Subscription
``` js
subscribe <= onPostUpdated({"endCursor":11})
```

- Subscription message:
``` js
{"data":{"counterUpdated":{"amount":21,"__typename":"Counter"}}} <= onCounterUpdated
```

- Unsubscription
``` js
unsubscribe <= onPostUpdated({"endCursor":11})
```

- PubSub publish on a server:
``` js
pubsub publish [ 'countUpdated',
  { id: 1, created_at: null, updated_at: null, amount: 7 } ]
```

- PubSub subscribe on a server:
``` js
pubsub subscribe postsUpdated => 2
```

- PubSub unsubscribe on a server:
``` js
pubsub unsubscribe [ 2 ]
```

- PubSub message generated on a server:
``` js
pubsub msg postsUpdated({"mutation":"CREATED","id":21,"node":{"id":21,"title":"New post 1"}})
```

## License
Copyright © 2017 [SysGears INC]. This source code is licensed under the [MIT] license.

[MIT]: LICENSE
[SysGears INC]: http://sysgears.com
