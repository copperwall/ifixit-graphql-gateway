import { ApolloServer, gql } from 'apollo-server-lambda';
import DataLoader from 'dataloader';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

function promiseAllOrError<K>(promises: ReadonlyArray<Promise<K>>): Promise<ReadonlyArray<K>> {
    let results: Array<K> = [];
    let completed = 0;

    return new Promise((resolve, reject) => {
        promises.forEach((promise, index) => {
            promise.then(value => {
                results[index] = value;
            }).catch(err => {
                results[index] = err;
            }).finally(() => {
                completed += 1;

                if (completed == promises.length) {
                    resolve(results);
                }
            });
        });
    });
}

const guideDataLoader = new DataLoader<number, unknown>(keys => {
    return new Promise((resolve, reject) => {
        const results = keys.map(key =>
            axios.get('https://ifixit.com/api/2.0/guides/' + key)
        );

        promiseAllOrError(results).then(results => {
            resolve(results.map(result => result.data));
        });
    });
});
const userDataLoader = new DataLoader<number, unknown>(keys => {
    return new Promise((resolve, reject) => {
        const results = keys.map(key =>
            axios.get('https://ifixit.com/api/2.0/users/' + key)
        );

        promiseAllOrError(results).then(results => {
            resolve(results.map(result => result.data));
        });
    });
});

const typeDefs = gql`
    type Guide {
        guideid: Int
        title: String
        summary: String
        category: String
        image: Image
        author: Author!
        public: Boolean
    }

    type Image {
        guid: String
        id: Int
        large: String
        medium: String
        original: String
        standard: String
        thumbnail: String
    }

    type Author {
        image: Image
        join_date: Int
        reputation: Int
        teams: [Int!]
        userid: Int
        username: String
        unique_username: String
    }

    type BadgeCount {
        bronze: Int
        silver: Int
        gold: Int
        total: Int
    }

    type User {
        userid: Int
        username: String
        unique_username: String
        image: Image
        teams: [Int]
        privileges: [String]
        reputation: Int
        join_date: Int
        location: String
        certification_count: Int
        summary: String
        about_raw: String
        about_rendered: String
    }

    type Query {
        guide(guideid: Int!): Guide
        user(userid: Int!): User
    }
`;

const resolvers = {
    Query: {
        guide: async (parent: object, { guideid } : { guideid: number }) => {
            return guideDataLoader.load(guideid);
        },
        user: async (parent: object, { userid } : { userid: number }) => {
            return userDataLoader.load(userid);
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    engine: {
        apiKey: process.env.ENGINE_API_KEY
    },
    introspection: true,
    playground: true
});

export const handler = server.createHandler();
