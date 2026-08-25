from django.db import transaction

from .models import Conversation, ConversationMember


@transaction.atomic
def get_or_create_private_conversation(user1, user2):
    if user1.pk == user2.pk:
        raise ValueError("A user cannot create a private conversation with themselves.")

    # Always store the smaller user ID first.
    if user1.pk < user2.pk:
        private_user_1 = user1
        private_user_2 = user2
    else:
        private_user_1 = user2
        private_user_2 = user1

    conversation = (
        Conversation.objects
        .filter(
            type=Conversation.ConversationType.PRIVATE,
            private_user_1=private_user_1,
            private_user_2=private_user_2,
        )
        .first()
    )

    if conversation:
        return conversation

    conversation = Conversation.objects.create(
        type=Conversation.ConversationType.PRIVATE,
        private_user_1=private_user_1,
        private_user_2=private_user_2,
    )

    ConversationMember.objects.bulk_create([
        ConversationMember(
            conversation=conversation,
            user=private_user_1,
            role=ConversationMember.MemberRole.MEMBER,
        ),
        ConversationMember(
            conversation=conversation,
            user=private_user_2,
            role=ConversationMember.MemberRole.MEMBER,
        ),
    ])

    return conversation


@transaction.atomic
def create_group_conversation(creator, name, users):
    conversation = Conversation.objects.create(
        type=Conversation.ConversationType.GROUP,
        name=name,
    )

    members = [
        ConversationMember(
            conversation=conversation,
            user=creator,
            role=ConversationMember.MemberRole.ADMIN,
        )
    ]

    for user in users:
        if user.pk != creator.pk:
            members.append(
                ConversationMember(
                    conversation=conversation,
                    user=user,
                    role=ConversationMember.MemberRole.MEMBER,
                )
            )

    ConversationMember.objects.bulk_create(members)

    return conversation