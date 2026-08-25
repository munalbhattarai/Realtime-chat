from channels.layers import get_channel_layer


def conversation_group_name(conversation_id):
    return f"conversation_{conversation_id}"


async def broadcast_message_created(
    conversation_id,
    message,
):
    channel_layer = get_channel_layer()

    await channel_layer.group_send(
        conversation_group_name(conversation_id),
        {
            "type": "message.created",
            "message_id": str(message.id),
            "conversation_id": str(conversation_id),
            "sender_id": message.sender_id,
            "sender_username": message.sender.username,
            "content": message.content,
            "created_at": message.created_at.isoformat(),
        },
    )


async def broadcast_message_updated(
    conversation_id,
    message,
):
    channel_layer = get_channel_layer()

    await channel_layer.group_send(
        conversation_group_name(conversation_id),
        {
            "type": "message.updated",
            "message_id": str(message.id),
            "conversation_id": str(conversation_id),
            "content": message.content,
            "updated_at": message.updated_at.isoformat(),
        },
    )


async def broadcast_message_deleted(
    conversation_id,
    message_id,
):
    channel_layer = get_channel_layer()

    await channel_layer.group_send(
        conversation_group_name(conversation_id),
        {
            "type": "message.deleted",
            "message_id": str(message_id),
            "conversation_id": str(conversation_id),
        },
    )


async def broadcast_message_read(
    conversation_id,
    message_id,
    user_id,
    username,
    read_at,
):
    channel_layer = get_channel_layer()

    await channel_layer.group_send(
        conversation_group_name(conversation_id),
        {
            "type": "message.read",
            "message_id": str(message_id),
            "conversation_id": str(conversation_id),
            "user_id": user_id,
            "username": username,
            "read_at": read_at,
        },
    )