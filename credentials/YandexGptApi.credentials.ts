import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class YandexGptApi implements ICredentialType {
	name = 'yandexGptApi';
	displayName = 'Yandex GPT API';
	documentationUrl = 'https://cloud.yandex.ru/ru/docs/yandexgpt/api-ref/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];
}