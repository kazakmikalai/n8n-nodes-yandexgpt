import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

export class YandexGpt implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Yandex GPT',
		name: 'yandexGpt',
		icon: 'file:yandexgpt.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Взаимодействие с Yandex GPT API',
		defaults: {
			name: 'Yandex GPT',
			color: '#ff6600',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'yandexGptApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Операция',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Генерация текста',
						value: 'textCompletion',
						description: 'Генерация текста с помощью Yandex GPT',
						action: 'Генерировать текст с помощью Yandex GPT',
					},
					{
						name: 'Чат',
						value: 'chat',
						description: 'Диалог с Yandex GPT',
						action: 'Создать диалог с Yandex GPT',
					},
				],
				default: 'textCompletion',
				noDataExpression: true,
			},
			{
				displayName: 'Идентификатор каталога',
				name: 'folderId',
				type: 'string',
				default: '',
				required: true,
				description: 'Идентификатор каталога в Yandex Cloud',
			},
			{
				displayName: 'Системное сообщение',
				name: 'systemMessage',
				type: 'string',
				default: '',
				description: 'Системное сообщение для определения контекста (роль системы)',
				displayOptions: {
					show: {
						operation: [
							'textCompletion',
							'chat',
						],
					},
				},
			},
			{
				displayName: 'Текст запроса',
				name: 'userMessage',
				type: 'string',
				default: '',
				description: 'Текст запроса для модели (роль пользователя)',
				displayOptions: {
					show: {
						operation: [
							'textCompletion',
						],
					},
				},
			},
			{
				displayName: 'Сообщения',
				name: 'messages',
				placeholder: 'Добавить сообщение',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						operation: [
							'chat',
						],
					},
				},
				options: [
					{
						name: 'messagesValues',
						displayName: 'Сообщения',
						values: [
							{
								displayName: 'Роль',
								name: 'role',
								type: 'options',
								options: [
									{
										name: 'Пользователь',
										value: 'user',
									},
									{
										name: 'Ассистент',
										value: 'assistant',
									},
								],
								default: 'user',
								description: 'Роль отправителя сообщения',
							},
							{
								displayName: 'Содержание',
								name: 'text',
								type: 'string',
								default: '',
								description: 'Текст сообщения',
							},
						],
					},
				],
			},
			{
				displayName: 'Дополнительные опции',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Добавить опцию',
				default: {},
				options: [
					{
						displayName: 'Температура',
						name: 'temperature',
						type: 'number',
						default: 0.6,
						description: 'Контролирует случайность генерации. Значения ближе к 0 дают более определенные ответы, значения ближе к 1 дают более случайные ответы.',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberStepSize: 0.1,
						},
					},
					{
						displayName: 'Максимальное количество токенов',
						name: 'maxTokens',
						type: 'number',
						default: 2000,
						description: 'Максимальная длина сгенерированного ответа в токенах',
						typeOptions: {
							minValue: 1,
							maxValue: 8192,
						},
					},
					{
						displayName: 'Режим рассуждения',
						name: 'reasoningMode',
						type: 'options',
						options: [
							{
								name: 'Отключено',
								value: 'DISABLED',
							},
							{
								name: 'Включено',
								value: 'ENABLED',
							},
							{
								name: 'Подробное',
								value: 'DETAILED',
							},
						],
						default: 'DISABLED',
						description: 'Режим рассуждения модели',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		
		const credentials = await this.getCredentials('yandexGptApi');
		const apiKey = credentials.apiKey as string;
		
		const operation = this.getNodeParameter('operation', 0) as string;
		const folderId = this.getNodeParameter('folderId', 0) as string;
		
		for (let i = 0; i < items.length; i++) {
			try {
				// Подготовка базового запроса
				const endpoint = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
				
				// Получение параметров из пользовательского ввода
				const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
					temperature?: number;
					maxTokens?: number;
					reasoningMode?: string;
				};
				
				const temperature = additionalOptions.temperature !== undefined ? additionalOptions.temperature : 0.6;
				const maxTokens = additionalOptions.maxTokens !== undefined ? additionalOptions.maxTokens : 2000;
				const reasoningMode = additionalOptions.reasoningMode !== undefined ? additionalOptions.reasoningMode : 'DISABLED';
				
				// Подготовка сообщений
				const messages = [];
				
				// Добавление системного сообщения, если оно предоставлено
				const systemMessage = this.getNodeParameter('systemMessage', i, '') as string;
				if (systemMessage) {
					messages.push({
						role: 'system',
						text: systemMessage,
					});
				}
				
				// Обработка в зависимости от операции
				if (operation === 'textCompletion') {
					const userMessage = this.getNodeParameter('userMessage', i, '') as string;
					if (userMessage) {
						messages.push({
							role: 'user',
							text: userMessage,
						});
					}
				} else if (operation === 'chat') {
					const messagesInput = this.getNodeParameter('messages.messagesValues', i, []) as Array<{
						role: string;
						text: string;
					}>;
					
					messagesInput.forEach(message => {
						messages.push({
							role: message.role,
							text: message.text,
						});
					});
				}
				
				// Формирование запроса
				const requestBody = {
					modelUri: `gpt://${folderId}/yandexgpt`,
					completionOptions: {
						stream: false,
						temperature,
						maxTokens: maxTokens.toString(),
						reasoningOptions: {
							mode: reasoningMode,
						},
					},
					messages,
				};
				
				// Выполнение запроса
				const options: OptionsWithUri = {
					method: 'POST',
					uri: endpoint,
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Api-Key ${apiKey}`,
					},
					body: requestBody,
					json: true,
				};
				
				const response = await this.helpers.request(options);
				
				// Обработка ответа
				returnData.push({
					json: {
						result: response.result,
						usage: response.usage,
						completionResponse: response,
					},
				});
				
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}
		
		return [returnData];
	}
}