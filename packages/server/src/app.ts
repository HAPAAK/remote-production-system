import express from 'express';
import cors from 'cors';
import { workflowRouter } from './routes/workflows';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/v1/workflows', workflowRouter);

app.use(errorHandler);

export default app;

