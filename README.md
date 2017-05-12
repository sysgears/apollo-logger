## Apollo GraphQL Logger

## Installation

```bash
npm install --save-dev apollo-logger
```

## Usage

For full logging you will need to attach Apollo Logger to:
- Network interface
- Subscription manager 
- And PubSub

``` js
import { addApolloLogging } from 'apollo-logger';

let networkInterface = addApolloLogging(createBatchingNetworkInterface({
  ...
}));

const pubsub = addApolloLogging(new PubSub());

const subscriptionManager = addApolloLogging(new SubscriptionManager(...));
```

## License
Copyright © 2017 [SysGears INC]. This source code is licensed under the [MIT] license.

[MIT]: LICENSE
[SysGears INC]: http://sysgears.com
