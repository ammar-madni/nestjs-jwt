import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(newUser: CreateUserDto) {
    return await this.prisma.user
      .create({
        data: {
          ...newUser,
          password: await argon.hash(newUser.password),
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new UnprocessableEntityException('Email already in use');
          }
        }
        throw error;
      });
  }

  async findAll(filter: any) {
    return await this.prisma.user.findMany({ where: filter });
  }

  async find(uniqueIdentifier: any) {
    return await this.prisma.user.findUnique({ where: uniqueIdentifier });
  }

  async update(id: number, user: UpdateUserDto) {
    return await this.prisma.user.update({
      where: { id },
      data: {
        ...user,
      },
    });
  }

  async delete(id: number) {
    return await this.prisma.user.delete({ where: { id } });
  }
}
