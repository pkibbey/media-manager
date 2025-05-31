import { getContentWarningsStats } from '@/actions/content-warnings/get-content-warnings-stats';

export async function GET() {
	const response = await getContentWarningsStats();
	return Response.json(response);
}
